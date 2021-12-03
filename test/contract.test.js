"use strict";

const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require("truffle-assertions");

const feeList = [
    BigNumber.from(80),
    BigNumber.from(10),
    BigNumber.from(10)
];

/**
 * @dev Presale.sol unit test
 */
describe("Presale & NFT contract test", function () {
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
            BigNumber.from(ethers.utils.parseEther("0.1")),
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

        accounts.forEach(async (account, i) => {
            if (i < total) await presale.connect(account).deposit({ value: mintPrice });
        });
    }

    it("should get 0.1 ETH mint price", async function () {
        const mintPrice = await this.presale.mintPrice();
        expect(ethers.utils.parseEther("0.1").eq(mintPrice));
    });

    accounts.forEach(function (account, i) {
        if (i < 3) {
            it(`should get account #${i} correct fee`, async function () {
                const _account = await this.presale.royaltyList(account);
                expect(_account.fee.eq(feeList[i]));
            });
        }
    })

    it("should deposit 0.1 ETH and increase totalMembers", async function () {
        // 1) deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        const contractBalance = await this.presale.getEtherBalance();
        expect(mintPrice.eq(contractBalance));

        // 2) check `totalMembers` length to be 1
        const totalMembers = await this.presale.getTotalMembers();
        expect(totalMembers.length === 1);
    });

    it("should allow users to refund after presale ends", async function () {
        // 1) Deposit 0.1 eth for 5 accounts (id 0 to 4)
        await depositX(this.accounts, this.presale);

        // 2) Check if the id is 4 (last index)
        expect((await this.presale.whitelist(this.accounts[4].address))["id"].eq(BigNumber.from("4")));

        // 3) refund the account
        await this.presale.connect(this.accounts[0]).refund();
        const contractBalance = (await this.presale.whitelist(this.accounts[0].address))["amount"];

        // 4) check the balance is 0
        expect(contractBalance.eq(BigNumber.from("0")));

        // 5) check the if the last element, went to the correct index of the refund user
        expect((await this.presale.whitelist(this.accounts[4].address))["id"].eq(BigNumber.from("0")));

        // 6) check the refunded user `isVerified` is set to false
        expect((await this.presale.whitelist(this.accounts[0].address))["isVerified"] === false);

        // 7) check the last user index `isVerified` is set to true
        expect((await this.presale.whitelist(this.accounts[4].address))["isVerified"] === true);

    });

    it("should mint a NFT", async function () {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        const balanceOf = await this.nft.balanceOf(this.accounts[0].address, BigNumber.from("0"));
        expect(balanceOf.eq(BigNumber.from("1")));
    });

    it("should getAmount if the user deposited ether", async function () {
        const mintPrice = await this.presale.mintPrice();
        await this.presale.connect(this.accounts[0]).deposit({ value: mintPrice });

        const whitelist = await this.presale.whitelist(this.accounts[0].address);

        // 1) check user0 deposit eth
        expect(mintPrice.eq(whitelist["amount"]));

        // 2) check user1 who didn't deposit eth
        const whitelist1 = await this.presale.whitelist(this.accounts[1].address);
        expect(whitelist1["amount"].eq(BigNumber.from("0")));
    });

    it("should get royalty fee for all 3 accounts unclaimed", async function() {
        await depositX(this.accounts, this.presale);
        await this.presale.setNft(this.nft.address);
        await this.presale.connect(this.accounts[0]).mintNft();

        /**
         * @dev map all fees to BN and calculate the fees
         */
        this.royaltyAccounts.forEach(async (account, i) => {
            const mintPrice = await this.presale.mintPrice();
            let fees = BigNumber.from(mintPrice).mul(feeList[i]).div(BigNumber.from("100"));

            let royaltyList = await this.presale.royaltyList(account);
            expect(fees.eq(royaltyList["unclaimed"]));
        });
    });

    it("should set a new uri", async function () {
        await this.nft.connect(this.accounts[0]).setURI("https://b.com/{id}.json");
        const getURI = await this.nft.uri(BigNumber.from("0"));
        expect(getURI === "https://b.com/{id}.json");
    });

    it("should fail, if the user deposits more than 0.1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("0.2")
            }),
            "Presale: 0.1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit less than 0.1 ETH", async function () {
        await truffleAssert.fails(
            this.presale.deposit({
                value: ethers.utils.parseEther("0.2")
            }),
            "Presale: 0.1 ETH to mint."
        );
    });

    it("should fail, if the user tries to deposit twice", async function () {
        // 1) first deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({ value: mintPrice });

        // 2) second deposit fails
        await truffleAssert.fails(
            this.presale.deposit({ value: mintPrice }),
            "Presale: You already deposit 0.1 ETH."
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
                    "Presale: 10,000 positions have been reserved."
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

    it("should fail, if the user is not deployer to \`setURI\`", async function () {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[1]).setURI("https://b.com/${id}.json"),
            "Ownable: caller is not the owner"
        );
    });

    it("should fail, if the user tries to call mint directly from NFT", async function () {
        await truffleAssert.fails(
            this.nft.connect(this.accounts[0]).mint(this.accounts[0].address),
            "NFT: internal error, direct mint."
        );
    });
});
