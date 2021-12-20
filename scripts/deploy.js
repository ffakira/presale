const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require("hardhat");
const fs = require("fs").promises;
const path = require("path");

(async () => {
try {
    const [deployer, royal1, royal2] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("NFT");
    const Presale = await ethers.getContractFactory("Presale");

    /**
     * @dev Deploying Presale smart contract
     */
    const presale = await Presale.deploy(
        BigNumber.from("10"),
        BigNumber.from(ethers.utils.parseEther("1")),
        [deployer.address, royal1.address, royal2.address],
        [BigNumber.from("80"), BigNumber.from("10"), BigNumber.from("10")]
    );

    /**
     * @dev Deploying NFT smart contract
     */
    const nft = await NFT.deploy(
        presale.address,
        "https://ipfs.io/ipfs/QmaFf4pmVXai2x5Y6BLUuTc3Nk4SProM3GSS9QBDqyxy7C"
    );

    await fs.writeFile(path.join(__dirname, "/deployed.json"), JSON.stringify({
        presale: presale.address,
        nft: nft.address

    }, null, 2));

    process.exit(0);

} catch (e) {
    console.error(e);
    process.exit(1);
}
})();
