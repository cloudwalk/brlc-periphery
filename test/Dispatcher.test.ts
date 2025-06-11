import { ethers, network, upgrades } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { checkContractUupsUpgrading, connect, getAddress, proveTx } from "../test-utils/eth";

const ADDRESS_ZERO = ethers.ZeroAddress;

interface Version {
  major: number;
  minor: number;
  patch: number;

  [key: string]: number; // Indexing signature to ensure that fields are iterated over in a key-value style
}

interface Fixture {
  dispatcherContract: Contract;
  compoundAgentMock: Contract;
  capybaraLiquidityPoolMock: Contract;
  tokenMock: Contract;
}

function checkEquality<T extends Record<string, unknown>>(actualObject: T, expectedObject: T, index?: number) {
  const indexString = !index ? "" : ` with index: ${index}`;
  Object.keys(expectedObject).forEach(property => {
    const value = actualObject[property];
    if (typeof value === "undefined" || typeof value === "function") {
      throw Error(`Property "${property}" is not found in the actual object` + indexString);
    }
    expect(value).to.eq(
      expectedObject[property],
      `Mismatch in the "${property}" property between the actual object and expected one` + indexString
    );
  });
}

async function setUpFixture<T>(func: () => Promise<T>): Promise<T> {
  if (network.name === "hardhat") {
    return loadFixture(func);
  } else {
    return func();
  }
}

describe("Contract 'Dispatcher'", async () => {
  // Errors of the lib contracts
  const REVERT_ERROR_IF_CONTRACT_INITIALIZATION_IS_INVALID = "InvalidInitialization";
  const REVERT_ERROR_IF_CONTRACT_IS_NOT_INITIALIZING = "NotInitializing";
  const REVERT_ERROR_IF_CONTRACT_IS_PAUSED = "EnforcedPause";
  const REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT = "AccessControlUnauthorizedAccount";

  // Errors of the contracts under test
  const REVERT_ERROR_IF_IMPLEMENTATION_ADDRESS_INVALID = "Dispatcher_ImplementationAddressInvalid";
  const REVERT_ERROR_IF_ACCOUNT_ADDRESS_ZERO = "Dispatcher_AccountAddressZero";

  // Events of the mock contracts
  const EVENT_NAME_MOCK_CONFIGURE_ADMIN_CALLED = "MockConfigureAdminCalled";
  const EVENT_NAME_MOCK_DEPOSIT_CALLED = "MockDepositCalled";
  const EVENT_NAME_MOCK_TRANSFER_OWNERSHIP_CALLED = "MockTransferOwnershipCalled";
  const EVENT_NAME_MOCK_REDEEM_UNDERLYING_CALLED = "MockRedeemUnderlyingCalled";

  // Events of the ERC20 contract
  const EVENT_NAME_TRANSFER = "Transfer";

  const EXPECTED_VERSION: Version = {
    major: 1,
    minor: 1,
    patch: 0
  };

  let dispatcherContractFactory: ContractFactory;

  let deployer: HardhatEthersSigner;
  let liquidityMover: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const DEFAULT_ADMIN_ROLE: string = ethers.ZeroHash;
  const OWNER_ROLE: string = ethers.id("OWNER_ROLE");
  const GRANTOR_ROLE: string = ethers.id("GRANTOR_ROLE");
  const PAUSER_ROLE: string = ethers.id("PAUSER_ROLE");
  const RESCUER_ROLE: string = ethers.id("RESCUER_ROLE");
  const LIQUIDITY_MOVER_ROLE: string = ethers.id("LIQUIDITY_MOVER_ROLE");

  before(async () => {
    [deployer, liquidityMover, stranger] = await ethers.getSigners();

    // Contract factories with the explicitly specified deployer account
    dispatcherContractFactory = await ethers.getContractFactory("DispatcherTestable");
    dispatcherContractFactory = dispatcherContractFactory.connect(deployer);
  });

  async function deployContracts(): Promise<Fixture> {
    let dispatcherContract: Contract = await upgrades.deployProxy(dispatcherContractFactory);
    await dispatcherContract.waitForDeployment();
    dispatcherContract = connect(dispatcherContract, deployer); // Explicitly specifying the initial account

    // Contract factories with the explicitly specified deployer account
    const tokenMockFactory = (await ethers.getContractFactory("ERC20TokenMock")).connect(deployer);
    const compoundAgentMockFactory = (await ethers.getContractFactory("CompoundAgentMock")).connect(deployer);
    const capybaraLiquidityPoolMockFactory =
      (await ethers.getContractFactory("CapybaraLiquidityPoolMock")).connect(deployer);

    let tokenMock: Contract = (await tokenMockFactory.deploy("ERC20 Test", "TEST")) as Contract;
    await tokenMock.waitForDeployment();

    let compoundAgentMock: Contract = (await compoundAgentMockFactory.deploy(getAddress(tokenMock))) as Contract;
    await compoundAgentMock.waitForDeployment();

    let capybaraLiquidityPoolMock: Contract = (await capybaraLiquidityPoolMockFactory.deploy(
      getAddress(tokenMock)
    )) as Contract;
    await capybaraLiquidityPoolMock.waitForDeployment();

    // Explicitly specifying the initial account
    tokenMock = connect(tokenMock, deployer);
    capybaraLiquidityPoolMock = connect(capybaraLiquidityPoolMock, deployer);
    compoundAgentMock = connect(compoundAgentMock, deployer);

    return {
      dispatcherContract,
      compoundAgentMock,
      capybaraLiquidityPoolMock,
      tokenMock
    };
  }

  async function pauseContract(contract: Contract) {
    await proveTx(contract.grantRole(GRANTOR_ROLE, deployer.address));
    await proveTx(contract.grantRole(PAUSER_ROLE, deployer.address));
    await proveTx(contract.pause());
  }

  describe("Function 'initialize()'", async () => {
    it("Configures the contract as expected", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);

      // Role hashes
      expect(await dispatcherContract.OWNER_ROLE()).to.equal(OWNER_ROLE);
      expect(await dispatcherContract.GRANTOR_ROLE()).to.equal(GRANTOR_ROLE);
      expect(await dispatcherContract.PAUSER_ROLE()).to.equal(PAUSER_ROLE);
      expect(await dispatcherContract.RESCUER_ROLE()).to.equal(RESCUER_ROLE);
      expect(await dispatcherContract.LIQUIDITY_MOVER_ROLE()).to.equal(LIQUIDITY_MOVER_ROLE);

      // The role admins
      expect(await dispatcherContract.getRoleAdmin(OWNER_ROLE)).to.equal(OWNER_ROLE);
      expect(await dispatcherContract.getRoleAdmin(GRANTOR_ROLE)).to.equal(OWNER_ROLE);
      expect(await dispatcherContract.getRoleAdmin(PAUSER_ROLE)).to.equal(GRANTOR_ROLE);
      expect(await dispatcherContract.getRoleAdmin(RESCUER_ROLE)).to.equal(GRANTOR_ROLE);
      expect(await dispatcherContract.getRoleAdmin(LIQUIDITY_MOVER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);

      // The deployer should have the owner role, but not the other roles
      expect(await dispatcherContract.hasRole(OWNER_ROLE, deployer.address)).to.equal(true);
      expect(await dispatcherContract.hasRole(GRANTOR_ROLE, deployer.address)).to.equal(false);
      expect(await dispatcherContract.hasRole(PAUSER_ROLE, deployer.address)).to.equal(false);
      expect(await dispatcherContract.hasRole(RESCUER_ROLE, deployer.address)).to.equal(false);
      expect(await dispatcherContract.hasRole(LIQUIDITY_MOVER_ROLE, deployer.address)).to.equal(false);

      // The initial contract state is unpaused
      expect(await dispatcherContract.paused()).to.equal(false);
    });

    it("Is reverted if it is called a second time", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        dispatcherContract.initialize()
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_INITIALIZATION_IS_INVALID);
    });

    it("Is reverted if the internal initializer is called outside the init process", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        dispatcherContract.call_parent_initialize()
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_IS_NOT_INITIALIZING);
    });

    it("Is reverted if the unchained internal initializer is called outside the init process", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        dispatcherContract.call_parent_initialize_unchained()
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_IS_NOT_INITIALIZING);
    });
  });

  describe("Function 'upgradeToAndCall()'", async () => {
    it("Executes as expected", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await checkContractUupsUpgrading(dispatcherContract, dispatcherContractFactory);
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);

      await expect(connect(dispatcherContract, stranger).upgradeToAndCall(getAddress(dispatcherContract), "0x"))
        .to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT)
        .withArgs(stranger.address, OWNER_ROLE);
    });
  });

  describe("Function 'upgradeTo()'", async () => {
    it("Executes as expected", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await checkContractUupsUpgrading(dispatcherContract, dispatcherContractFactory, "upgradeTo(address)");
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);

      await expect(connect(dispatcherContract, stranger).upgradeTo(getAddress(dispatcherContract)))
        .to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT)
        .withArgs(stranger.address, OWNER_ROLE);
    });

    it("Is reverted if the provided implementation address is not a dispatcher contract", async () => {
      const { dispatcherContract, compoundAgentMock } = await setUpFixture(deployContracts);

      await expect(dispatcherContract.upgradeTo(getAddress(compoundAgentMock)))
        .to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_IMPLEMENTATION_ADDRESS_INVALID);
    });
  });

  describe("Function '$__VERSION()'", async () => {
    it("Returns expected values", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      const tokenVersion = await dispatcherContract.$__VERSION();
      checkEquality(tokenVersion, EXPECTED_VERSION);
    });
  });

  describe("Function 'initLiquidityMoverRole()'", async () => {
    async function executeAndCheck(dispatcherContract: Contract, accounts: string[]) {
      await proveTx(dispatcherContract.initLiquidityMoverRole(accounts));

      expect(await dispatcherContract.getRoleAdmin(LIQUIDITY_MOVER_ROLE)).to.equal(GRANTOR_ROLE);
      for (const account of accounts) {
        expect(await dispatcherContract.hasRole(LIQUIDITY_MOVER_ROLE, account))
          .to.equal(true, `The role is NOT set for account with address ${account}`);
      }
      expect(await dispatcherContract.hasRole(LIQUIDITY_MOVER_ROLE, deployer.address))
        .to.equal(false, `The role is set for the deployer (${deployer.address}) but it must not be`);
    }

    it("Executes as expected for some accounts with non-zero addresses", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await executeAndCheck(dispatcherContract, [stranger.address, getAddress(dispatcherContract)]);
    });

    it("Executes as expected for an empty account array", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await executeAndCheck(dispatcherContract, []);
    });

    it("Executes as expected even if the contract is paused", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await pauseContract(dispatcherContract);
      await executeAndCheck(dispatcherContract, [stranger.address, getAddress(dispatcherContract)]);
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        connect(dispatcherContract, stranger).initLiquidityMoverRole([])
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(stranger.address, OWNER_ROLE);
    });

    it("Is reverted if one of the provided accounts has the zero address", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        dispatcherContract.initLiquidityMoverRole([stranger.address, ADDRESS_ZERO])
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_ACCOUNT_ADDRESS_ZERO
      );
    });
  });

  describe("Function 'removeLiquidityMoverRole()'", async () => {
    async function executeAndCheck(dispatcherContract: Contract, accounts: string[]) {
      await proveTx(dispatcherContract.removeLiquidityMoverRole(accounts));

      expect(await dispatcherContract.getRoleAdmin(LIQUIDITY_MOVER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
      for (const account of accounts) {
        expect(await dispatcherContract.hasRole(LIQUIDITY_MOVER_ROLE, account))
          .to.equal(false, `The role is NOT set for account with address ${account}`);
      }
    }

    it("Executes as expected for some accounts with non-zero addresses", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      const accounts = [stranger.address, getAddress(dispatcherContract)];
      await proveTx(dispatcherContract.initLiquidityMoverRole(accounts));

      await executeAndCheck(dispatcherContract, accounts);
    });

    it("Executes as expected for an empty account array", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await executeAndCheck(dispatcherContract, []);
    });

    it("Executes as expected even if the contract is paused", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      const accounts = [stranger.address, getAddress(dispatcherContract)];
      await proveTx(dispatcherContract.initLiquidityMoverRole(accounts));
      await pauseContract(dispatcherContract);

      await executeAndCheck(dispatcherContract, [stranger.address, getAddress(dispatcherContract)]);
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        connect(dispatcherContract, stranger).removeLiquidityMoverRole([])
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(stranger.address, OWNER_ROLE);
    });

    it("Is reverted if one of the provided accounts has the zero address", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);
      await expect(
        dispatcherContract.removeLiquidityMoverRole([stranger.address, ADDRESS_ZERO])
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_ACCOUNT_ADDRESS_ZERO
      );
    });
  });

  describe("Function 'transferOwnershipForCompoundAgent()'", async () => {
    async function executeAndCheck(fixture: Fixture, newAccount: string) {
      const { dispatcherContract, compoundAgentMock } = fixture;

      const tx = dispatcherContract.transferOwnershipForCompoundAgent(
        getAddress(compoundAgentMock),
        newAccount
      );

      await expect(tx).to.emit(compoundAgentMock, EVENT_NAME_MOCK_TRANSFER_OWNERSHIP_CALLED).withArgs(newAccount);
    }

    it("Executes as expected with different account addresses", async () => {
      const fixture = await setUpFixture(deployContracts);

      await executeAndCheck(fixture, stranger.address);
      await executeAndCheck(fixture, ADDRESS_ZERO);
    });

    it("Is reverted if the contract is paused", async () => {
      const { dispatcherContract, compoundAgentMock } = await setUpFixture(deployContracts);
      await pauseContract(dispatcherContract);
      await expect(
        dispatcherContract.transferOwnershipForCompoundAgent(getAddress(compoundAgentMock), stranger.address)
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_IS_PAUSED);
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract, compoundAgentMock } = await setUpFixture(deployContracts);
      await expect(
        connect(dispatcherContract, stranger).transferOwnershipForCompoundAgent(
          getAddress(compoundAgentMock),
          stranger.address
        )
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(stranger.address, OWNER_ROLE);
    });
  });

  describe("Function 'configureAdminBatchForCompoundAgent()'", async () => {
    async function executeAndCheck(fixture: Fixture, newStatus: boolean, accounts: string[]) {
      const { dispatcherContract, compoundAgentMock } = fixture;
      const counter = Number(await compoundAgentMock.configureAdminCallCounter());

      const tx = dispatcherContract.configureAdminBatchForCompoundAgent(
        getAddress(compoundAgentMock),
        newStatus,
        accounts
      );

      if (accounts.length > 0) {
        for (let i = 0; i < accounts.length; ++i) {
          const account = accounts[i];
          const expectedCounter = counter + i + 1;
          await expect(tx).to.emit(compoundAgentMock, EVENT_NAME_MOCK_CONFIGURE_ADMIN_CALLED).withArgs(
            account,
            newStatus,
            expectedCounter
          );
        }
      } else {
        await expect(tx).not.to.emit(compoundAgentMock, EVENT_NAME_MOCK_CONFIGURE_ADMIN_CALLED);
      }
    }

    it("Executes as expected with different account address and new status values", async () => {
      const fixture = await setUpFixture(deployContracts);

      let newStatus = false;
      let accounts = [stranger.address, ADDRESS_ZERO];
      await executeAndCheck(fixture, newStatus, accounts);

      newStatus = true;
      accounts = [stranger.address, stranger.address];
      await executeAndCheck(fixture, newStatus, accounts);

      newStatus = false;
      accounts = [stranger.address];
      await executeAndCheck(fixture, newStatus, accounts);

      newStatus = true;
      accounts = [];
      await executeAndCheck(fixture, newStatus, accounts);
    });

    it("Is reverted if the contract is paused", async () => {
      const { dispatcherContract, compoundAgentMock } = await setUpFixture(deployContracts);
      await pauseContract(dispatcherContract);
      const newState = true;
      await expect(
        dispatcherContract.configureAdminBatchForCompoundAgent(getAddress(compoundAgentMock), newState, [])
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_IS_PAUSED);
    });

    it("Is reverted if the caller does not have the owner role", async () => {
      const { dispatcherContract, compoundAgentMock } = await setUpFixture(deployContracts);
      const newState = true;
      await expect(
        connect(dispatcherContract, stranger).configureAdminBatchForCompoundAgent(
          getAddress(compoundAgentMock),
          newState,
          []
        )
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(stranger.address, OWNER_ROLE);
    });
  });

  describe("Function 'moveLiquidityFromCompoundToCapybara()'", async () => {
    it("Executes as expected ", async () => {
      const fixture = await setUpFixture(deployContracts);
      const { dispatcherContract, compoundAgentMock, capybaraLiquidityPoolMock, tokenMock } = fixture;
      const amount = 12345678;

      await proveTx(dispatcherContract.initLiquidityMoverRole([liquidityMover.address]));
      await proveTx(compoundAgentMock.transferOwnership(getAddress(dispatcherContract)));

      expect(await tokenMock.balanceOf(getAddress(capybaraLiquidityPoolMock))).to.equal(0);

      const tx = connect(dispatcherContract, liquidityMover).moveLiquidityFromCompoundToCapybara(
        amount,
        getAddress(compoundAgentMock),
        getAddress(capybaraLiquidityPoolMock)
      );

      await expect(tx)
        .to.emit(compoundAgentMock, EVENT_NAME_MOCK_REDEEM_UNDERLYING_CALLED)
        .withArgs(amount);
      await expect(tx)
        .to.emit(capybaraLiquidityPoolMock, EVENT_NAME_MOCK_DEPOSIT_CALLED)
        .withArgs(amount);
      await expect(tx)
        .to.emit(tokenMock, EVENT_NAME_TRANSFER)
        .withArgs(ADDRESS_ZERO, getAddress(compoundAgentMock), amount);
      await expect(tx)
        .to.emit(tokenMock, EVENT_NAME_TRANSFER)
        .withArgs(getAddress(compoundAgentMock), getAddress(dispatcherContract), amount);
      await expect(tx)
        .to.emit(tokenMock, EVENT_NAME_TRANSFER)
        .withArgs(getAddress(dispatcherContract), getAddress(capybaraLiquidityPoolMock), amount);

      expect(await tokenMock.balanceOf(getAddress(capybaraLiquidityPoolMock))).to.equal(amount);
    });

    it("Is reverted if the contract is paused", async () => {
      const { dispatcherContract, compoundAgentMock, capybaraLiquidityPoolMock } = await setUpFixture(deployContracts);
      await pauseContract(dispatcherContract);
      const amount = 123456789;

      await expect(
        dispatcherContract.moveLiquidityFromCompoundToCapybara(
          amount,
          getAddress(compoundAgentMock),
          getAddress(capybaraLiquidityPoolMock)
        )
      ).to.be.revertedWithCustomError(dispatcherContract, REVERT_ERROR_IF_CONTRACT_IS_PAUSED);
    });

    it("Is reverted if the caller does not have the liquidity mover role", async () => {
      const { dispatcherContract, compoundAgentMock, capybaraLiquidityPoolMock } = await setUpFixture(deployContracts);
      const amount = 123456789;

      await expect(
        connect(dispatcherContract, deployer).moveLiquidityFromCompoundToCapybara(
          amount,
          getAddress(compoundAgentMock),
          getAddress(capybaraLiquidityPoolMock)
        )
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(deployer.address, LIQUIDITY_MOVER_ROLE);

      await expect(
        connect(dispatcherContract, stranger).moveLiquidityFromCompoundToCapybara(
          amount,
          getAddress(compoundAgentMock),
          getAddress(capybaraLiquidityPoolMock)
        )
      ).to.be.revertedWithCustomError(
        dispatcherContract,
        REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT
      ).withArgs(stranger.address, LIQUIDITY_MOVER_ROLE);
    });
  });
});
