// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

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

    function mint(address _user) external {
        require(_msgSender() == address(presale), "NFT: internal error, direct mint.");        
        for (uint256 i = 0; i < presale.getTotalMembers().length; i++) {
            if(_user == presale.getTotalMembers()[i].owner) {
                _mint(_user, i, 1, "");
            }
        }
    }

    function setURI(string memory _uri) public onlyOwner {
        _setURI(_uri);
    }
}
