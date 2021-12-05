require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("hardhat-gas-reporter");
require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  gasReporter: {
    coinmarketcap: process.env.CMC_API_KEY,
    currency: "USD",
    enabled: true
  },

  networks: {
    bscTesnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY]
    },

    rinkeby: {
      hardfork: "london",
      url: `https://snowy-late-shadow.rinkeby.quiknode.pro/${process.env.API_KEY}/`,
      chainId: 4,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
