// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Presale is Ownable, ReentrancyGuard {
    uint256 public totalNfts = 10_000;
    uint256 public mintPrice = 0.1 ether;
    bool public isPresale = true;

    event TransferEther(uint256 amount, address user);

    struct Whitelist {
        uint256 id;
        address owner;
        uint256 amount;
        bool isVerified;
    }

    Whitelist[] public totalMembers;
    
    mapping(address => Whitelist) public whitelist;

    constructor(uint256 _totalNfts, uint256 _mintPrice) {
        totalNfts = _totalNfts;
        mintPrice = _mintPrice;
    }

    receive() external payable {}

    // @TODO implement shuffle
    function shuffle() public onlyOwner{
        require(!isPresale, "Presale: You can only shuffle after the pesale ends.");
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

    function getEtherBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function getAmount(address _caller) external view returns(uint256){
        return whitelist[_caller].amount;
    }

    function getTotalMembers() external view returns(Whitelist[] memory){
        return totalMembers;
    }
}
