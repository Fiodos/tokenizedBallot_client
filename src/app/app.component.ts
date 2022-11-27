import { ethers, Signer } from 'ethers'
import { Component } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import ballotAbi from '../assets/Ballot.json'
import erc20Json from '../assets/MyERC20Votes.json'

declare global {
	interface Window {
		ethereum: any
	}
}

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {

	signer: any | undefined
	winner: any | undefined
	provider: any | undefined
	accounts: any | undefined
	proposal: any | undefined
	proposals: any[]
	voted: boolean | undefined
	votingPower: number | undefined
	etherBalance: number | undefined
	tokenBalance: number | undefined
	tokenAddress: string | undefined
	signerAddress: string | undefined
	winningProposal: number | undefined
	ballotVotingPower: number | undefined
	erc20Contract: ethers.Contract | undefined
	ballotContract: ethers.Contract | undefined

	constructor(private http: HttpClient) {
		this.provider = new ethers.providers.Web3Provider(window.ethereum)
		this.proposals = []
	}

	async ngOnInit() {
		await this.connect()
		this.getUserStats()
		this.getBallot()
	}

	async getVotingPower() {
		this.ballotVotingPower = await this.ballotContract!['votingPower'](this.signerAddress)
		this.ballotVotingPower = parseFloat(ethers.utils.formatEther(this.ballotVotingPower!))
	}

	async connect() {
		await this.provider.send("eth_requestAccounts", []);
		this.accounts = await this.provider.listAccounts()
		this.signer = await this.provider.getSigner()
		this.signerAddress = await this.signer.getAddress()
		console.log(`connected to ${this.signerAddress}`)
	}

	async connectToBallot(value: string) {
		this.ballotContract = new ethers.Contract(value, ballotAbi, this.signer)
		if (this.ballotContract) {
			// send ballotAddress to backend
			this.setBallot(value)
			for(let i = 0; i < 3; i++) {
				this.proposal = await this.ballotContract['proposals'](i)
				this.proposals[i] = ethers.utils.parseBytes32String(this.proposal[0])
			}
			this.getVotingPower()
		}
	}

	async getWinner() {
		this.winner = await this.ballotContract!['winnerName']()
		this.winner = ethers.utils.parseBytes32String(this.winner)
	}

	async delegate(to: string) {
		let tx = await this.erc20Contract!['delegate'](to)
		console.log(tx)
	}

	async vote(proposal: number) {
		// signer already voted
		if (this.ballotVotingPower == this.votingPower) {
			this.voted = true;
			return
		}
		let tx = await this.ballotContract!['vote'](proposal, this.tokenBalance)
		console.log(tx)
	}

	getUserStats() {
		this.http.get<any>('http://localhost:3000/token-address').subscribe((ans) => {
			this.tokenAddress = ans.result
			if (this.tokenAddress) {
				this.signer.getBalance().then((balanceBN: ethers.BigNumberish) => {
					this.etherBalance = parseFloat(ethers.utils.formatEther(balanceBN))
				})
				this.erc20Contract = new ethers.Contract(this.tokenAddress, erc20Json.abi, this.signer)
				this.erc20Contract['balanceOf'](this.signerAddress).then((balanceBN: ethers.BigNumberish) => {
					this.tokenBalance = parseFloat(ethers.utils.formatEther(balanceBN))
				})
				this.erc20Contract['getVotes'](this.signerAddress).then((votesBN: ethers.BigNumberish) => {
					this.votingPower = parseFloat(ethers.utils.formatEther(votesBN))
				})
			}
		})
	}

	claimTokens() {
		this.http.post<any>('http://localhost:3000/claim-tokens', {address: this.signerAddress, amount: '10'}).subscribe((ans) => {
			console.log({ ans })
		})
	}

	// is called when we connect to a ballot
	setBallot(ballotAddress: string) {
		this.http.post<any>('http://localhost:3000/set-ballot', {address: ballotAddress}).subscribe((ans) => {
			console.log({ ans })
		})
	}

	// is called everytime the page is reloaded e.g
	getBallot() {
		this.http.get<any>('http://localhost:3000/ballot-address').subscribe((ans) => {
			this.connectToBallot(ans.result)
		})
	}
}
