import { ethers } from "hardhat"
import { Comptroller } from "../../../types"



  interface ComptrollerFixture {
    comptroller: Comptroller
    // token1: TestERC20
    // token2: TestERC20
  }

async function comptrollerFixture(): Promise<ComptrollerFixture> {
    const comptrollerFactroy = await ethers.getContractFactory('Comptroller')
    const comptroller = (await comptrollerFactroy.deploy()) as Comptroller
    return { comptroller }
  }
  
//   interface TokensFixture {
//     token0: TestERC20
//     token1: TestERC20
//     token2: TestERC20
//   }
  
//   async function tokensFixture(): Promise<TokensFixture> {
//     const tokenFactory = await ethers.getContractFactory('TestERC20')
//     const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
//     const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
//     const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  
//     const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
//       tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
//     )
  
//     return { token0, token1, token2 }
//   }
  