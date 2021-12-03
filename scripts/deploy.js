// const { BigNumber } = require("@ethersproject/bignumber");
// const { ethers } = require("hardhat");
// const fs = require("fs").promises;
// const path = require("path");

// (async () => {
// try {
//     const accounts = [
//         "0x13947a404DF9C36B32dDF78B8087Ea23181c8B32",
//         "0xCB61068c1E905773872551563E41Bf2B373555f5",
//         "0xe10Fea1eF078Cff45e4c6290dB4aE7d27Fe16436"
//     ];

//     const feeList = [10, 10, 80];

//     // const [deployer] = await ethers.getSigners();

//     const Presale = await ethers.getContractFactory("Presale");
//     const Maskbyte = await ethers.getContractFactory("Maskbyte");
//     const RandomNumberConsumer = await ethers.getContractFactory("RandomNumberConsumer");

//     /**
//      * @dev Deploying Presale smart contract
//      * @TODO test deployment script, NOT for mainnet
//      */
//     const presale = await Presale.deploy(
//         BigNumber.from("5"),
//         ethers.utils.parseEther(BigNumber.from("0.1")),
//         accounts,
//         feeList

//     );

//     /**
//      * @dev Deploying NFT smart contract
//      */
//     const SECONDS = 60;
//     const maskbyte = await Maskbyte.deploy(
//         presale.address,
//         BigNumber.from(`${SECONDS * 60}`),
//         "https://a.com/",
//         "https://b.com/"
//     );

//     await fs.writeFile(path.join(__dirname, "/scripts/deployed.json"), JSON.stringify({
//         presale: presale.address,
//         nft: maskbyte.address

//     }));

//     process.exit(0);

// } catch (e) {
//     console.error(e);
//     process.exit(1);
// }


// })();
