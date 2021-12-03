// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./Presale.sol";

contract NFT is ERC1155, Ownable, ReentrancyGuard {
    Presale presale;
    uint256 durationReveal;
    uint256 public totalRoyaltyMembers = 0;

    event AddRoyalty(uint256 fee, address user);
    event TransferEther(uint256 amount, address user);

    struct RoyaltyList {
        uint256 id;
        uint256 fee;
        uint256 unclaimed;
        uint256 claimed;
        bool isVerified;
    }

    address[] public royaltyMembers;

    mapping(address => RoyaltyList) public royaltyList;
    mapping(address => uint256) public userTokenId;

    /**
     * @dev set URI: https://a.com/
     * uri("ipfs://content_hash/{id}.json")
     */
    constructor(Presale _presale, uint256 _duration, string memory _uri, address[] memory _addresses, uint256[] memory _fee) ERC1155(_uri) {
        presale = _presale;
        durationReveal = block.timestamp + _duration;

        for (uint256 i = 0; i < _addresses.length; i++) {
            _addFeeHandler(i, _addresses[i], _fee[i]);
            totalRoyaltyMembers++;
        }
    }

    receive() external payable {}

    function mint() public {
        require(!presale.isPresale(), "NFT: You can only mintn after the presale ends.");
        require(presale.getAmount(_msgSender()) == presale.mintPrice(), "NFT: You have not joined presale.");
        address _callee = _msgSender();
        
        for (uint256 i = 0; i < presale.getTotalMembers().length; i++) {
            if(_callee == presale.getTotalMembers()[i].owner) {
                _mint(_callee, i, 1, "");
                userTokenId[_callee] = i;

                _calcRoyaltyFees();
            }
        }
    }

    function _addFeeHandler(uint256 _id, address _address, uint256 _fee) internal {
        royaltyList[_address] = RoyaltyList(_id, _fee, 0, 0, true);
        royaltyMembers.push(_address);

        emit AddRoyalty(_fee, _address);
    }

    function _calcRoyaltyFees() internal {
        for (uint256 i = 0; i < totalRoyaltyMembers; i++) {
            uint256 _calcFee = (royaltyList[royaltyMembers[i]].fee * presale.mintPrice()) / 100;
            royaltyList[royaltyMembers[i]].unclaimed += _calcFee;
        }
    }

    function claim() public payable nonReentrant {
        require(royaltyList[_msgSender()].isVerified, "Presale: You are not eligible to claim.");
        require(royaltyList[_msgSender()].unclaimed > 0, "Presale: There is nothing be claimed.");

        uint256 _unclaimed = royaltyList[_msgSender()].unclaimed;

        (bool sent, ) = payable(address(this)).call{value: _unclaimed}("");
        require(sent, "Presale: failed to transfer ether.");

        royaltyList[_msgSender()].unclaimed = 0;
        royaltyList[_msgSender()].claimed += _unclaimed;

        emit TransferEther(_unclaimed, _msgSender());
    }

    function setURI(string memory _uri) public onlyOwner {
        _setURI(_uri);
    }

    // @TODO Check if Opensea supports NFT
    // function uri(uint256 _tokenId) override public view returns (string memory) {
    //     require(_tokenId < 10000, "NFT: invalid tokenId.");

    //     if (block.timestamp <= durationReveal) {
    //         return string(
    //             abi.encodePacked(
    //                 placeholderURI,
    //                 Strings.toString(_tokenId),
    //                 ".json"
    //             )
    //         );

    //     } else {
    //         return string(
    //             abi.encodePacked(
    //                 revealedURI,
    //                 Strings.toString(_tokenId),
    //                 ".json"
    //             )
    //         );
    //     }
    // }
}
