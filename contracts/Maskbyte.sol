// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./Presale.sol";

contract Maskbyte is ERC1155 {
    Presale presale;
    using Counters for Counters.Counter;
    Counters.Counter public _ids;
    
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
        require(presale.getAmount(_msgSender()) == presale.mintPrice(), "Maskbyte: You have not joined presale.");
        // require(presale);
        require(_ids.current() < 10000, "Maskbyte: There can be only 10000 MaskBytes.");
        _mint(_msgSender(), _ids.current(), 1, "");
        _ids.increment();
    }

    function uri(uint256 _tokenId) override public view returns (string memory) {
        require(_tokenId < 10000, "Maskbyte: invalid tokenId.");

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
