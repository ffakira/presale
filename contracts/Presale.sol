// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./NFT.sol";

contract Presale is Ownable, ReentrancyGuard {
    NFT nft;
    uint256 public totalNfts = 10_000;
    uint256 public mintPrice = 0.1 ether;
    uint256 public totalRoyaltyMembers = 0;
    bool public isPresale = true;

    event AddRoyalty(uint256 fee, address user);
    event TransferEther(uint256 amount, address user);

    struct RoyaltyList {
        uint256 id;
        uint256 fee;
        uint256 unclaimed;
        uint256 claimed;
        bool isVerified;
    }

    struct Whitelist {
        uint256 id;
        address owner;
        uint256 amount;
        bool isVerified;
    }

    address[] public royaltyMembers;
    Whitelist[] public totalMembers;
    
    mapping(address => RoyaltyList) public royaltyList;
    mapping(address => Whitelist) public whitelist;

    constructor(uint256 _totalNfts, uint256 _mintPrice, address[] memory _addresses, uint256[] memory _fee) {
        totalNfts = _totalNfts;
        mintPrice = _mintPrice;

        for (uint256 i = 0; i < _addresses.length; i++) {
            _addFeeHandler(i, _addresses[i], _fee[i]);
            totalRoyaltyMembers++;
        }
    }

    receive() external payable {}

    // @TODO implement shuffle
    function shuffle() public onlyOwner{
        require(!isPresale, "Presale: You can only shuffle after the presale ends.");
    }

    function setNft(NFT _nft) public onlyOwner {
        require(address(_nft) != address(0), "Presale: You cannot set to null.");
        nft = _nft;
    }

    function _addFeeHandler(uint256 _id, address _address, uint256 _fee) internal {
        royaltyList[_address] = RoyaltyList(_id, _fee, 0, 0, true);
        royaltyMembers.push(_address);

        emit AddRoyalty(_fee, _address);
    }

    function _calcRoyaltyFee() internal {
        for (uint256 i = 0; i < totalRoyaltyMembers; i++) {
            uint256 _calcFee = (royaltyList[royaltyMembers[i]].fee * mintPrice) / 100;
            royaltyList[royaltyMembers[i]].unclaimed += _calcFee;
        }
    }

    // @TODO implement signed messages to whitelist users
    function deposit() public payable nonReentrant {
        require(!(whitelist[_msgSender()].amount >= mintPrice), "Presale: You already deposit 0.1 ETH.");
        require(totalMembers.length < totalNfts, "Presale: 10,000 positions have been reserved.");

        (bool sent,) = payable(address(this)).call{value: mintPrice}("");
        require(msg.value == mintPrice, "Presale: 0.1 ETH to mint.");
        require(sent, "Presale: failed to transfer ether.");

        uint256 _id = totalMembers.length;
        whitelist[_msgSender()] = Whitelist(_id, _msgSender(), msg.value, true);
        totalMembers.push(whitelist[_msgSender()]);

        if (totalMembers.length == totalNfts) isPresale = false;
        emit TransferEther(mintPrice, _msgSender());
    }

    function refund() public payable nonReentrant {
        require(!isPresale, "Presale: You can only claim after the presale ends.");
        require(!(whitelist[_msgSender()].amount == 0), "Presale: There is nothing to be withdrawn.");
        
        (bool sent,) = payable(_msgSender()).call{value: whitelist[_msgSender()].amount}("");
        require(sent, "Presale: failed to transfer ether.");

        uint256 _prevId = whitelist[_msgSender()].id;
        delete totalMembers[_prevId];
        delete whitelist[_msgSender()];

        totalMembers[_prevId] = totalMembers[totalMembers.length - 1];
        whitelist[totalMembers[totalMembers.length - 1].owner].id = _prevId;
        totalMembers.pop();

        emit TransferEther(mintPrice, _msgSender());
    }

    function mintNft() public nonReentrant {
        require(address(nft) != address(0), "Presale: NFT address is not set.");
        require(!isPresale, "Presale: You can only mint after the presale ends.");
        require(whitelist[_msgSender()].amount == mintPrice, "Presale: You have not joined presale. Or you already claimed NFT.");
        
        nft.mint(_msgSender());
        _calcRoyaltyFee();

        whitelist[_msgSender()].amount = 0;
    }

    function getEtherBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function getTotalMembers() external view returns(Whitelist[] memory){
        return totalMembers;
    }
}
