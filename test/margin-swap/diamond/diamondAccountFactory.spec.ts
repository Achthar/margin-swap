import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, network } from 'hardhat'
import { DelegatorFacet, DiamondFacetManager, MoneyMarketOperator__factory, ImplementationProvider, ImplementationProvider__factory, MoneyMarketOperator, ProxyDeployer, ProxyDeployer__factory, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MarginAccountProxy__factory, DiamondFactory, DiamondFactory__factory, DiamondFacetManager__factory, AccountInit, AccountInit__factory, MoneyMarketFacet, MoneyMarketFacet__factory, DelegatorFacet__factory } from '../../../types';
import { FacetCutAction, getSelectors } from '../../diamond/libraries/diamond';
import { expect } from '../shared/expect'


// we prepare a setup for compound in hardhat
// this series of tests checks that the features used for the margin swap implementation
// are correclty set up and working
describe('Diamond Account Factory', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let diamondDeployer: DiamondFactory
    let diamondFacetManager: DiamondFacetManager
    let moneyMarketFacet: MoneyMarketFacet
    let dataProvider: MoneyMarketDataProvider
    let accountInit: AccountInit
    let delegatorFacet: DelegatorFacet


    beforeEach('get wallets and fixture', async () => {

        [deployer, alice, bob, carol] = await ethers.getSigners();
        diamondFacetManager = await new DiamondFacetManager__factory(deployer).deploy()
        accountInit = await new AccountInit__factory(deployer).deploy()
        delegatorFacet = await new DelegatorFacet__factory(deployer).deploy()

        await diamondFacetManager.diamondCut(
            [{
                facetAddress: accountInit.address,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(accountInit)
            }]
        )
        diamondDeployer = await new DiamondFactory__factory(deployer).deploy()
        moneyMarketFacet = await new MoneyMarketFacet__factory(deployer).deploy()

        await diamondFacetManager.diamondCut(
            [{
                facetAddress: moneyMarketFacet.address,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(moneyMarketFacet)
            }]
        )

        await diamondFacetManager.diamondCut(
            [{
                facetAddress: delegatorFacet.address,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(delegatorFacet)
            }]
        )

        dataProvider = await new MoneyMarketDataProvider__factory(deployer).deploy()

        await diamondDeployer.initialize(diamondFacetManager.address, dataProvider.address)
    })


    it('deploys account', async () => {
        await diamondDeployer.connect(alice).createAccount()
        const accounts = await diamondDeployer.getAccounts(alice.address)
        expect(accounts.length).to.equal(1)
    })

    it('allows manager assignment', async () => {
        await diamondDeployer.connect(alice).createAccount()

        const accounts = await diamondDeployer.getAccounts(alice.address)
        console.log(accounts)
        const ac = await new ethers.Contract(accounts[0], DelegatorFacet__factory.createInterface()) as DelegatorFacet
        await ac.connect(alice).addManager(deployer.address)
        let isManager = await ac.connect(alice).isManager(deployer.address)
        expect(isManager).to.equal(true)

        await ac.connect(alice).removeManager(deployer.address)
        isManager = await ac.connect(alice).isManager(deployer.address)
        expect(isManager).to.equal(false)
    })

})
