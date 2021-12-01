const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");

const accounts = [
    "0x13947a404DF9C36B32dDF78B8087Ea23181c8B32",
    "0xCB61068c1E905773872551563E41Bf2B373555f5",
    "0xe10Fea1eF078Cff45e4c6290dB4aE7d27Fe16436"
];

const feeList = [10, 10, 80];

describe("Presale contract", function() {
    beforeEach(async function () {
        const Presale = await ethers.getContractFactory("Presale");
        const Maskbyte = await ethers.getContractFactory("Maskbyte");
        
        /**
         * @TODO refactor the placeholder image
         */
        this.maskbyte = await Maskbyte.deploy(
            30,
            "https://a.com/",
            "http://b.com/"
        );

        this.presale = await Presale.deploy(    
            this.maskbyte.address,
            ethers.utils.parseEther("0.1"),
            accounts,
            feeList
        );
    });

    it("should get 0.1 ETH mint price", async function() {
        const mintPrice = await this.presale.mintPrice();
        expect(ethers.utils.parseEther("0.1").eq(mintPrice));
    });

    accounts.forEach(function (account, i) {
        it(`should get account #${i} correct fee`, async function () {
            const _account = await this.presale.royaltyList(account);
            expect(_account.fee.eq(BigNumber.from(feeList[i])));
        });
    });

    it("should deposit 0.1 ETH and increase totalMembers", async function() {
        // 1) deposit
        const mintPrice = await this.presale.mintPrice();
        await this.presale.deposit({value: mintPrice});

        const contractBalance = await this.presale.getEtherBalance();
        expect(mintPrice.eq(contractBalance));

        // 2) check `totalMembers` length to be 1
        const totalMembers = await this.presale.getTotalMembers();
        expect(totalMembers.length === 1);
    });
});
