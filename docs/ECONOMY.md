# $SCREAM candy economy

The active game is **Let’s Scream Together**. All current reward balances are local simulations with no cash value. Nothing collects creator fees, buys tokens, charges entry or submits blockchain transactions. `ECONOMY_MODE=live` refuses startup.

## Implemented hide-and-hunt rules

- Entry and cottage plots are free. A player must claim a plot, build a house, hide candy, complete a server-verified escape, and publish before hunting through the API.
- A published house reserves 1,000 test $SCREAM from a finite treasury for a 24-hour round. The initial 300,000-token fixture is inserted once, never replenished on restart. Demo houses also reserve funds so a solo tester has places to raid.
- A hunter must escape with candy in a server-replayed run lasting at least 15 seconds. The hunter receives 10% of the house’s remaining round balance, rounded down. For example, 1,000 becomes 900 after a 100-token raid, then 810 after a different hunter earns 90.
- A wallet can receive one hunter reward per house per round. Owners, unpublished hunters, old house versions, failed/short visits and profiles linked to the owner by a recent tip are excluded. Microphone peaks do not determine rewards.
- The owner receives the remaining balance when the round ends. Settlement happens transactionally when that house’s round is read, raided or renewed. Repeated settlement does not duplicate credits. A fresh round needs a fresh funded allocation; publication never creates money.
- A round binds the published house hash. Draft editing remains possible, but publishing a different hiding place waits until the round ends. This prevents an owner from moving the candy after hunters enter.
- Plot choices are permanent. Free cottage bounds are 14 × 20 × 16 blocks. New holder plots are PLANNED and locked in both the selector and server claim handler. Previously saved larger houses remain compatible. Holdings do not multiply round allocations.

The plot selector and Candy Vault identify simulation balances explicitly. The older optional bounty/tip/cosmetics API remains for existing test compatibility; its account grants exist only under `ECONOMY_MODE=test`. Those grants are separate from the finite candy treasury and are not creator revenue.

## Proposed real funding model

Only actual collected creator revenue should fund a future real reward treasury. Convert an explicitly budgeted portion to $SCREAM, reserve the available budget before announcing a round, and divide it across eligible active houses. Use a published reserve policy to absorb quiet trading days. If collected revenue is insufficient, reduce or pause new reward allocations while keeping the game free and playable. Do not promise fixed returns or pay old obligations from new player deposits.

Creator-fee rates depend on platform and trading conditions; do not assume a fixed percentage or automatic access to them. [Pump’s fee documentation](https://pump.fun/docs/fees) describes its fee structure. Solana’s [Token-2022 transfer fees](https://solana.com/docs/tokens/extensions/transfer-fees) are a separate mint extension, not automatic creator-fee funding. This build does not assume that $SCREAM uses that extension.

The 1,000-per-house local allocation is a gameplay fixture, not a sustainable live emission formula. Free identities can be multiplied, owners can collude with hunters, and inactive houses currently retain their local allocation. Before real rewards, use budgeted rounds with admission limits, qualified visitor/activity requirements, identity/reputation checks and published anti-collusion rules. Those production protections are not claimed to be solved by a minimum run time or wallet signature.

## Accounting and failure behavior

Reservations, raid credits, balance reductions and settlement share database transactions. SQLite serializes transactions; PostgreSQL locks affected rows. A unique active-round index prevents two simultaneous allocations for a house. Each raid uses its verified run ID, with an additional unique round/wallet constraint. A duplicate finish returns the recorded credit. A lost HTTP acknowledgement can be retried without paying again; an aborted database transaction leaves no partial debit or credit.

No recovery lease, remote settlement state machine or payment worker was introduced. A future real transfer system must separately test lease loss, crash boundaries, ambiguous remote outcomes, chain finality and post-ack local failure. The older fairground worker is not connected to candy rewards. Real custody, token balances, fee collection, legal eligibility and release approval remain outside this local build.

## Rework gameplay values

Outdoor loose candy is a separate, server-owned session counter with a 500 bag cap. Search caches and banking at the Lantern Gate do not issue $SCREAM credits or draw from the finite treasury. Session counters persist across screen changes and authenticated reconnects within the server night; they reset at dawn or server restart. Up to three stash chests share the same house reward round and cannot multiply its raid credit. Build palette prices are design-only; local construction is free. Fog Night has no reward multiplier.
