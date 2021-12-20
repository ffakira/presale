// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./Presale.sol";

contract NFT is ERC1155, Ownable {
    Presale presale;

    /**
     * @dev set URI: https://a.com/
     * uri("ipfs://content_hash/{id}.json")
     */
    constructor(Presale _presale, string memory _uri) ERC1155(_uri) {
        presale = _presale;
    }

    function setURI(string memory _uri) public onlyOwner {
        _setURI(_uri);
    }

    function mint(address _user, uint256 _id) external {
        require(_msgSender() == address(presale), "NFT: internal error, direct mint."); 
        _mint(_user, _id, 1, "");
    }
}
