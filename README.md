# UZH POS Uniswap V3 Interface

A customised fork of the official Uniswap V3 interface, pre‑configured to work on the **University of Zurich Proof‑of‑Stake network (chain id 710)**.
It lets users

* connect any EVM wallet (tested with MetaMask)
* mint example tokens via an on‑chain faucet
* add/remove concentrated‑liquidity positions
* swap tokens directly on UZH POS

---

## Live demo

**[https://uzh-pos-swap.netlify.app/](https://uzh-pos-swap.netlify.app/)**  


## Quick start (local development)

```bash
# 1 Clone
$ git clone https://gitlab.uzh.ch/blockchain-programming/uniswap_interface_uzh
$ cd uniswap_interface_uzh

# 2 GraphQL key 
$ echo 'GRAPH_API_KEY=<your-key>' >> .env

# 3 Node & Yarn (tested with Node 18, Yarn 4)
$ nvm use 18          
$ corepack enable   

# 4 GitLab package‑registry token
$ export NPM_TOKEN=<glpat-xxxxxxxxxxxxxxxxxxxxxxxx>

# 5 Install deps & start dev server
$ yarn      
$ yarn start

# 6 Browse http://localhost:3000
```
