// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NFT.sol";

contract Presale is Ownable, ReentrancyGuard {
    NFT nft;
    uint256 public totalNfts = 1000;
    uint256 public mintPrice = 1 ether;
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
    
    mapping(uint => uint) ids;

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

    function shuffle() public onlyOwner {
        require(!isPresale, "Presale: You can only shuffle after the presale ends.");
        uint entropy = uint(blockhash(block.number - 1));
        for (uint i = 0; i < totalNfts; i++) {
            uint choice = i + (entropy % (totalNfts - i));
            if (ids[choice] == 0) ids[choice] = choice + 1;
            if (ids[i] == 0) ids[i] = i + 1;
            
            uint tmp = ids[i];
            ids[i] = ids[choice];
            ids[choice] = tmp;
        }
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
        uint256 tempFee = mintPrice;
        for (uint256 i = 0; i < totalRoyaltyMembers; i++) {
            uint256 _calcFee = (royaltyList[royaltyMembers[i]].fee * mintPrice) / 100;
            royaltyList[royaltyMembers[i]].unclaimed += _calcFee;
            tempFee -= _calcFee;
        }
        royaltyList[royaltyMembers[2]].unclaimed += tempFee;
    }

    // @TODO implement signed messages to whitelist users
    function deposit() public payable nonReentrant {
        require(!(whitelist[_msgSender()].amount >= mintPrice), "Presale: You already deposit 1 ETH.");
        require(totalMembers.length < totalNfts, "Presale: 1000 positions have been reserved.");

        (bool sent,) = payable(address(this)).call{value: mintPrice}("");
        require(msg.value == mintPrice, "Presale: 1 ETH to mint.");
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

    function claim() public payable nonReentrant {
        require(royaltyList[_msgSender()].isVerified, "Presale: Unauthorized access.");
        require(!isPresale, "Presale: You can only claim after the presale ends.");
        require(royaltyList[_msgSender()].unclaimed > 0, "Presale: There is nothing to claim.");

        uint256 unclaimedAmount = royaltyList[_msgSender()].unclaimed;
        (bool sent,) = payable(_msgSender()).call{value: unclaimedAmount }("");
        require(sent, "Presale: failed to transfer ether.");

        royaltyList[_msgSender()].unclaimed = 0;
        royaltyList[_msgSender()].claimed += unclaimedAmount;

        emit TransferEther(0, _msgSender());
    }

    function mintNft() public nonReentrant {
        require(address(nft) != address(0), "Presale: NFT address is not set.");
        require(!isPresale, "Presale: You can only mint after the presale ends.");
        require(whitelist[_msgSender()].amount == mintPrice, "Presale: You have not joined presale. Or you already claimed NFT.");

        for (uint256 i = 0; i < totalMembers.length; i++) {
            if (_msgSender() == totalMembers[i].owner) {
                nft.mint(_msgSender(), i);
            }
        }
        _calcRoyaltyFee();
        whitelist[_msgSender()].amount = 0;
    }

    function getBalance() public view returns(uint256) {
        return address(this).balance;
    }

    function getTotalMembers() external view returns(uint256){
        return totalMembers.length;
    }
    
    function getShuffle(uint256 _counter) public view returns(uint256) {
        return ids[_counter];
    }
}
