"use strict";

const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const truffleAssert = require("truffle-assertions");

/**
 * @dev Presale.sol unit test
 */
describe("Presale & NFT contract test", function () {
    const feeList = [
        BigNumber.from(80),
        BigNumber.from(10),
        BigNumber.from(10)
    ];
    
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        this.royaltyAccounts = [
            this.accounts[5].address,
            this.accounts[6].address,
            this.accounts[7].address
        ];

        const Presale = await ethers.getContractFactory("Presale");
        const NFT = await ethers.getContractFactory("NFT");

        /**
         * @dev for testing purpose maximum of 5 NFTs are going to be minted.
         */
        this.presale = await Presale.deploy(
            BigNumber.from("5"),
            BigNumber.from(ethers.utils.parseEther("1")),
            this.royaltyAccounts,
            feeList
        );

        this.nft = await NFT.deploy(
            this.presale.address,
            "https://a.com/"
        );
    });

    async function depositX(accounts, presale, total = 5) {
        if (total <= 0 || total > 10) throw new Error("Invalid length account (range 1..10)");
        const mintPrice = await presale.mintPrice();

        for (let i = 0; i < total; i++) {
            await presale.connect(accounts[i]).deposit({ value: mintPrice });
        }
    }

    it("should get 1 ETH mint price", async function () {
        const mintPrice = await this.presale.mintPrice();
        expect(ethers.utils.parseEther("1")).to.equal(mintPrice);
    });

    it("should get accounts correct fee", function () {
        this.royaltyAccounts.forEach(async (account, i) => {
            if (i < 3) {
                const _account = await this.presale.royaltyList(account);
                expect(_account.fee).to.equal(feeList[i]);
            }
        });
    });

    it("should deposit 1 ETH and increase totalMembers", async function () {
        // 1) deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        const contractBalance = await this.presale.getBalance();
        expect(mintPrice).to.deep.equal(contractBalance);

        // 2) check `totalMembers` length to be 1
        const totalMembers = await this.presale.getTotalMembers();
        expect(totalMembers).to.deep.equal(BigNumber.from("1"));
    });

    it("should allow users to refund after presale ends", async function () {
        // 1) Deposit 1 eth for 5 accounts (id 0 to 4)
        await depositX(this.accounts, this.presale);

        // 2) Check if the id is 4 (last index)
        const account4 = (await this.presale.whitelist(this.accounts[4].address))["id"];
        expect(account4).to.deep.equal(BigNumber.from("4"));

        // 3) refund the account
        await this.presale.connect(this.accounts[0]).refund();
        const whitelistBalance = (await this.presale.whitelist(this.accounts[0].address))["amount"];
        expect(whitelistBalance).to.deep.equal(BigNumber.from("0"));

        // 4) Check the smart contract has 4 ETH
        const contractBalance = await this.presale.getBalance();
        expect(contractBalance).to.deep.equal(BigNumber.from(ethers.utils.parseEther("4")));

        // 5) check the if the last id (went to idx: 0), went to the correct index of the refund user
        expect((await this.presale.whitelist(this.accounts[4].address))["id"]).to.deep.equal(BigNumber.from("0"));

        // 6) check the refunded user `isVerified` is set to false
        expect((await this.presale.whitelist(this.accounts[0].address))["isVerified"]).to.equal(false);

        // 7) check the last user index `isVerified` is set to true
        expect((await this.presale.whitelist(this.accounts[4].address))["isVerified"]).to.equal(true);
    });

    it("should mint a NFT", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        const balanceOf = await this.nft.balanceOf(this.accounts[0].address, BigNumber.from("0"));
        expect(balanceOf).to.deep.equal(BigNumber.from("1"));
    });

    it("should getAmount if the user deposited ether", async function () {
        const mintPrice = await this.presale.mintPrice();
        await this.presale.connect(this.accounts[0]).deposit({ value: mintPrice });

        const whitelist = await this.presale.whitelist(this.accounts[0].address);

        // 1) check user0 deposit eth
        expect(mintPrice).to.deep.equal(whitelist["amount"]);

        // 2) check user1 who didn't deposit eth
        const whitelist1 = await this.presale.whitelist(this.accounts[1].address);
        expect(whitelist1["amount"]).to.deep.equal(BigNumber.from("0"));
    });

    it("should get royalty fee for all 3 accounts unclaimed", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        /**
         * @dev map all fees to BN and calculate the fees
         */
        this.royaltyAccounts.forEach(async (account, i) => {
            const mintPrice = await this.presale.mintPrice();
            const fees = BigNumber.from(mintPrice).mul(feeList[i]).div(BigNumber.from("100"));

            const royaltyList = await this.presale.royaltyList(account);
            expect(fees).to.deep.equal(royaltyList["unclaimed"]);
        });
    });

    it("should allow to claim royalty", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.connect(this.accounts[0]).setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        // 1) check initial balance for user 80% fees
        let accountUnclaimed5 = (await this.presale.royaltyList(this.accounts[5].address))["unclaimed"];
        expect(accountUnclaimed5).to.deep.equal(ethers.utils.parseEther("0.8"));

        // 2) check the state after the royalty have been claimed
        await this.presale.connect(this.accounts[5]).claim();
        accountUnclaimed5 = (await this.presale.royaltyList(this.accounts[5].address))["unclaimed"];
        expect(accountUnclaimed5).to.deep.equal(BigNumber.from("0"));

        // 3) expect the balance of contract be 4.2 ETH
        const contractBalance = await this.presale.getBalance();
        expect(contractBalance).to.deep.equal(ethers.utils.parseEther("4.2"));
    });

    it("should set a new uri", async function () {
        await this.nft.connect(this.accounts[0]).setURI("https://b.com/{id}.json");
        const getURI = await this.nft.uri(BigNumber.from("0"));
        expect(getURI).to.equal("https://b.com/{id}.json");
    });

    it("should fail, if the user deposits more than 1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("1.1")
            }),
            "Presale: 1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit less than 1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("0.999")
            }),
            "Presale: 1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit twice", async function () {
        // 1) first deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        // 2) second deposit fails
        await truffleAssert.fails(
            this.presale.deposit({ value: mintPrice }),
            "Presale: You already deposit 1 ETH."
        );
    });

    it("should fail, if the presale has not ended", async function () {
        await truffleAssert.fails(
            this.presale.refund(),
            "Presale: You can only claim after the presale ends."
        );
    });

    it("should fail, if the user tries to mint twice", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        await truffleAssert.fails(
            this.presale.connect(this.accounts[0]).mintNft(),
            "Presale: You have not joined presale. Or you already claimed NFT."
        );
    });

    it("should fail, if user didn\'t deposit ether", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);

        await truffleAssert.fails(
            this.presale.connect(this.accounts[5]).mintNft(),
            "Presale: You have not joined presale. Or you already claimed NFT."
        );

        await truffleAssert.fails(
            this.presale.connect(this.accounts[5]).refund(),
            "Presale: There is nothing to be withdrawn."
        );
    });

    it("should fail, if user didn\'t set NFT address", async function () {
        await depositX(this.accounts, this.presale);
        await truffleAssert.fails(
            this.presale.connect(this.accounts[0]).mintNft(),
            "Presale: NFT address is not set."
        );
    });

    it("should fail, if user tries to deposit after all positions are taken", async function () {
        const mintPrice = await this.presale.mintPrice();
        let total = 0;

        for (let account of this.accounts) {
            if (total < 5) await this.presale.connect(account).deposit({ value: mintPrice });
            if (total == 6) {
                await truffleAssert.fails(
                    this.presale.connect(account).deposit({ value: mintPrice }),
                    "Presale: 1000 positions have been reserved."
                );
            }
            total++;
        }
    });

    it("should fail, if the user tries to shuffle before the presale ends", async function () {
        await truffleAssert.fails(
            this.presale.connect(this.accounts[0]).shuffle(),
            "Presale: You can only shuffle after the presale ends."
        );
    });

    it("should fail, if the user tries to mint before the presale ends", async function () {
        const mintPrice = await this.presale.mintPrice();
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).deposit({ value: mintPrice });

        await truffleAssert.fails(
            this.presale.connect(this.accounts[0]).mintNft(),
            "Presale: You can only mint after the presale ends."
        );
    });

    it("should fail, if user sets nft address to 0", async function () {
        await truffleAssert.fails(
            this.presale.setNft(ethers.constants.AddressZero),
            "Presale: You cannot set to null."
        );
    });

    it("should fail, if the royalty tries to claim before the presale", async function () {
        await truffleAssert.fails(
            this.presale.connect(this.accounts[5]).claim(),
            "Presale: You can only claim after the presale ends."
        );
    });

    it("should fail, if the royalty tries to claim when no user has minted", async function () {
        await depositX(this.accounts, this.presale);
        await truffleAssert.fails(
            this.presale.connect(this.accounts[5]).claim(),
            "Presale: There is nothing to claim."
        );
    });

    it("should fail, if the user tries to claim royalty fee", async function () {
        await depositX(this.accounts, this.presale);
        await truffleAssert.fails(
            this.presale.connect(this.accounts[0]).claim(),
            "Presale: Unauthorized access."
        );
    });

    it("should fail, if the user is not deployer to \`setURI\`", async function () {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[1]).setURI("https://b.com/${id}.json"),
            "Ownable: caller is not the owner"
        );
    });

    it("should fail, if the user tries to call mint directly from NFT", async function () {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[0]).mint(this.accounts[0].address, BigNumber.from("0")),
            "NFT: internal error, direct mint."
        );
    });
});
