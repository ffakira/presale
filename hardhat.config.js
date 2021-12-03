require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("dotenv").config;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.7",
  // networks: {
  //   bscTesnet: {
  //     url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  //     chainId: 97,
  //     accounts: [process.env.PRIVATE_KEY]
  //   },

  //   rinkeby: {
  //     hardfork: "london",
  //     url: `https://snowy-late-shadow.rinkeby.quiknode.pro/${process.envAPI_KEY}/`,
  //     chainId: 4,
  //     accounts: [process.env.PRIVATE_KEY]
  //   }
  // }
};
