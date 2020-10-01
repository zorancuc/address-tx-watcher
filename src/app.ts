import Etherscan from 'node-etherscan-api';
import Web3 from 'web3';
import fs from 'fs';

const etherscan = new Etherscan('', 'ROPSTEN');
const LAST_BLOCK_FILENAME = './lastblock.txt';
const MINT_FILENAME = './MINT.txt';
const SEND_FILENAME = './SEND.txt';


interface BlockRange {
    startBlock: number,
    endBlock: number
}

interface Options { 
    startBlock: number,
    endBlock: number,
}    

interface LastBlockData {
    lastblock: string
}  

async function getBlockRange(fileName: string): Promise<BlockRange> {
    const fileData = fs.readFileSync(fileName, {encoding:'utf8', flag:'r'});
    const lastblockData: LastBlockData = JSON.parse(fileData);
    let startBlock =  parseInt(lastblockData.lastblock, 10) + 1;
    let endBlock = await etherscan.getRecentBlockNumber();
    return {startBlock, endBlock}
}

async function listenTransactions(addressToWatch: string, custodyAddress:string) {
    try {
        const options: Options = await getBlockRange(LAST_BLOCK_FILENAME);
        console.log(options);
        console.log(addressToWatch);
        if (addressToWatch == undefined) {
            return;
        }
        if (Number.isNaN(options.startBlock)) {
            options.startBlock = 0;
        }

        if (Number.isNaN(options.endBlock)) {
            setTimeout(listenTransactions, 200, addressToWatch, custodyAddress);
            return;
        }

        console.log("Call Get Transactions");
        etherscan
            .getTransactions(addressToWatch, options)
            .then(res => {
                for (let i = 0; i < res.length; i++ ) {
                    if (res[i].to === addressToWatch) {
                        console.log("Action");
                        const lastBlockData: LastBlockData = {
                            lastblock: res[i].blockNumber
                        }
                        fs.writeFileSync(LAST_BLOCK_FILENAME, JSON.stringify(lastBlockData), {encoding:'utf8', flag:'w'});
                        const mintData = `MINT ${res[i].value} ${res[i].from}\r\n`;
                        fs.appendFileSync(MINT_FILENAME, mintData);
                        const sendData = `SEND ${res[i].value} ${custodyAddress}\r\n`;
                        fs.appendFileSync(SEND_FILENAME, sendData);
                    } else if (res[i].from === addressToWatch) {

                    }
                }
                setTimeout(listenTransactions, 200, addressToWatch, custodyAddress);
            })
            .catch(err => {
                console.error(err);
                setTimeout(listenTransactions, 200, addressToWatch, custodyAddress);
            })
    } catch (error) {
        console.log(error);
        setTimeout(listenTransactions, 200, addressToWatch, custodyAddress);
    }
}

async function startListenTo(addressToWatch: string, custodyAddress: string): Promise<void> {
    
    setTimeout(listenTransactions, 200, addressToWatch, custodyAddress);
}

const argv = process.argv;
if (argv.length < 4) {
    console.log("Please input address to watch and custody address");
} else {
    const addressToWatch:string = argv[2];
    const custodyAddress:string = argv[3];
    if (Web3.utils.isAddress(addressToWatch) && Web3.utils.isAddress(custodyAddress)) {
        startListenTo(addressToWatch, custodyAddress);
    }
    else {
        console.log('Please input Valid Addresses')
    }
}


