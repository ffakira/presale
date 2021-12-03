// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./Presale.sol";

contract NFT is ERC1155 {
    Presale presale;
    
    string revealedURI;
    string placeholderURI;
    
    uint256 durationReveal;

    /**
     * @dev set URI: https://a.com/
     * uri("ipfs://content_hash/{id}.json")
     */
    constructor(Presale _presale, uint256 _duration, string memory _revealedURI, string memory _placeholderURI) ERC1155(_placeholderURI) {
        presale = _presale;
        revealedURI = _revealedURI;
        placeholderURI = _placeholderURI;

        durationReveal = block.timestamp + _duration;
    }

    function mint() public {
        require(presale.getAmount(_msgSender()) == presale.mintPrice(), "NFT: You have not joined presale.");
        address _callee = _msgSender();
        
        for (uint256 i = 0; i < presale.getTotalMembers().length; i++) {
            if(_callee == presale.getTotalMembers()[i].owner) {
                _mint(_callee, i, 1, "");
            }
        }
    }

    function uri(uint256 _tokenId) override public view returns (string memory) {
        require(_tokenId < 10000, "NFT: invalid tokenId.");

        if (block.timestamp <= durationReveal) {
            return string(
                abi.encodePacked(
                    placeholderURI,
                    Strings.toString(_tokenId),
                    ".json"
                )
            );

        } else {
            return string(
                abi.encodePacked(
                    revealedURI,
                    Strings.toString(_tokenId),
                    ".json"
                )
            );
        }
    }
}