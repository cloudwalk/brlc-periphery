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

describe("Contracts 'Dispatcher'", async () => {
  // Errors of the lib contracts
  const REVERT_ERROR_IF_CONTRACT_INITIALIZATION_IS_INVALID = "InvalidInitialization";
  const REVERT_ERROR_IF_CONTRACT_IS_NOT_INITIALIZING = "NotInitializing";
  const REVERT_ERROR_IF_CONTRACT_IS_PAUSED = "EnforcedPause";
  const REVERT_ERROR_IF_UNAUTHORIZED_ACCOUNT = "AccessControlUnauthorizedAccount";

  // Errors of the contracts under test
  const REVERT_ERROR_IF_IMPLEMENTATION_ADDRESS_INVALID = "Dispatcher_ImplementationAddressInvalid";

  // Events of the mock contracts
  const EVENT_NAME_MOCK_TRANSFER_OWNERSHIP_CALLED = "MockTransferOwnershipCalled";
  const EVENT_NAME_MOCK_CONFIGURE_ADMIN_CALLED = "MockConfigureAdminCalled";

  const EXPECTED_VERSION: Version = {
    major: 1,
    minor: 0,
    patch: 0
  };

  let dispatcherContractFactory: ContractFactory;
  let compoundAgentMockFactory: ContractFactory;
  let deployer: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const ownerRole: string = ethers.id("OWNER_ROLE");
  const pauserRole: string = ethers.id("PAUSER_ROLE");
  const rescuerRole: string = ethers.id("RESCUER_ROLE");

  before(async () => {
    [deployer, stranger] = await ethers.getSigners();

    // Contract factories with the explicitly specified deployer account
    dispatcherContractFactory = await ethers.getContractFactory("DispatcherTestable");
    dispatcherContractFactory = dispatcherContractFactory.connect(deployer);
    compoundAgentMockFactory = await ethers.getContractFactory("CompoundAgentMock");
    compoundAgentMockFactory = compoundAgentMockFactory.connect(deployer);
  });

  async function deployContracts(): Promise<Fixture> {
    let dispatcherContract: Contract = await upgrades.deployProxy(dispatcherContractFactory);
    await dispatcherContract.waitForDeployment();
    dispatcherContract = connect(dispatcherContract, deployer); // Explicitly specifying the initial account

    let compoundAgentMock: Contract = await compoundAgentMockFactory.deploy() as Contract;
    await compoundAgentMock.waitForDeployment();
    compoundAgentMock = connect(compoundAgentMock, deployer); // Explicitly specifying the initial account

    return {
      dispatcherContract,
      compoundAgentMock
    };
  }

  async function pauseContract(contract: Contract) {
    await proveTx(contract.grantRole(pauserRole, deployer.address));
    await proveTx(contract.pause());
  }

  describe("Function 'initialize()'", async () => {
    it("Configures the contract as expected", async () => {
      const { dispatcherContract } = await setUpFixture(deployContracts);

      // Role hashes
      expect(await dispatcherContract.OWNER_ROLE()).to.equal(ownerRole);
      expect(await dispatcherContract.PAUSER_ROLE()).to.equal(pauserRole);
      expect(await dispatcherContract.RESCUER_ROLE()).to.equal(rescuerRole);

      // The role admins
      expect(await dispatcherContract.getRoleAdmin(ownerRole)).to.equal(ownerRole);
      expect(await dispatcherContract.getRoleAdmin(pauserRole)).to.equal(ownerRole);
      expect(await dispatcherContract.getRoleAdmin(rescuerRole)).to.equal(ownerRole);

      // The deployer should have the owner role, but not the other roles
      expect(await dispatcherContract.hasRole(ownerRole, deployer.address)).to.equal(true);
      expect(await dispatcherContract.hasRole(pauserRole, deployer.address)).to.equal(false);
      expect(await dispatcherContract.hasRole(rescuerRole, deployer.address)).to.equal(false);

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
        .withArgs(stranger.address, ownerRole);
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
        .withArgs(stranger.address, ownerRole);
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
      ).withArgs(stranger.address, ownerRole);
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
      ).withArgs(stranger.address, ownerRole);
    });
  });
});
