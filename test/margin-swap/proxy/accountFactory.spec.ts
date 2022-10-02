import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, network } from 'hardhat'
import { MoneyMarketOperator__factory, ImplementationProvider, ImplementationProvider__factory, MoneyMarketOperator, ProxyDeployer, ProxyDeployer__factory, MoneyMarketDataProvider, MoneyMarketDataProvider__factory, MarginAccountProxy__factory } from '../../../types';


// we prepare a setup for compound in hardhat
// this series of tests checks that the features used for the margin swap implementation
// are correclty set up and working
describe('Account Factory', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let proxyDeployer: ProxyDeployer
    let logicProvider: ImplementationProvider
    let logic: MoneyMarketOperator
    let dataProvider: MoneyMarketDataProvider


    beforeEach('get wallets and fixture', async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();
        proxyDeployer = await new ProxyDeployer__factory(deployer).deploy()
        logic = await new MoneyMarketOperator__factory(deployer).deploy()
        logicProvider = await new ImplementationProvider__factory(deployer).deploy(logic.address)
        dataProvider = await new MoneyMarketDataProvider__factory(deployer).deploy()
        await proxyDeployer.initialize(logicProvider.address, dataProvider.address)
    })


    it('deploys account', async () => {
        await proxyDeployer.connect(alice).createAccount(alice.address)
    })

    it('deploys account and returns address', async () => {
        await proxyDeployer.connect(alice).createAccount(alice.address)

        const accounts = await proxyDeployer.getAccounts(alice.address)
        console.log(accounts)
        const ac = await new ethers.Contract(accounts[0], MarginAccountProxy__factory.createInterface())
        const imp = await ac.connect(deployer)._implementation()
        console.log(imp)
    })

})
