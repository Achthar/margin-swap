import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat'
import { expect } from './shared/expect'
import { CompoundFixture, generateCompoundFixture, ONE_18 } from './shared/fixtures'

describe('Compound Baseline Test Hardhat', async () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress;
    let compoundFixture: CompoundFixture


    before('get wallets and fixture', async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();
        const arr = [1, 2, 4, 5, 6]
        const options = {
            tokenCount: 5,
            collateralFactors: arr.map(x => ONE_18),
            exchangeRates: arr.map(x => ONE_18),
            borrowRates: arr.map(x => ONE_18),
            cEthExchangeRate: ONE_18,
            cEthBorrowRate: ONE_18,
            compRate: ONE_18,
            closeFactor: ONE_18
        }
        compoundFixture = await generateCompoundFixture(deployer, options)
        // comptroller = await comptrollerFixture(deployer, {})
        // cToken = await cTokenFixture(deployer,
        //     {
        //         kind: 'erc20',
        //         root: deployer.address,
        //         comptroller: comptroller.comptroller,
        //         supportMarket: true,
        //         addCompMarket: false,
        //         collateralFactor: ONE_18
        //     }
        // )
    })

    it('deploys everything', async () => {
        await expect(
            compoundFixture.comptroller.address
        ).to.not.be.equal('')
    })

    it('allows collateral provision', async () => {
        const underlying = compoundFixture.underlyings[0]
        const cToken = compoundFixture.cTokens[0]
        const am = await underlying.totalSupply()
        await underlying.connect(deployer).transfer(alice.address, am.div(2))

        await underlying.connect(alice).approve(cToken.address, am)

        await cToken.connect(alice).mint(am.div(2))

    })


    //    
})
