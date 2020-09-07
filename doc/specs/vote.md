# Vote

## Abstract

Help user to vote a message.

## Inspiration

With LikeBot, the channel admin can send a message and emojis to the bot, the bot will create a message with button of these emojis. However, text button can't be set, and the message sent with button can't be edited easily.

Here we want to add button to the channel with any text possible, then user can vote by clicking the button.

## Solution Design

### Button creating

For a message, the bot will first try to find default buttons maching the message. 
If there is no match, the global default will be provided, all these "defaults" can be empty.

Then the message is sent with the buttons.

```js
{
    user: "username",
    message: "something bijection to one message",
    name: "the name of the button"
}
```

### Button modifying

To modify the button, we first modify the button in the database, then run update function.

### User voting

When user click a button, the bot will firstly check if he have voted before.
- If he have voted before but not in a minute, the user will be prompted that he have voted with time and button.
  Then if the user click again, follow the steps below. 
- If he have voted before in a minute, the bot will check if he have pressed the same button of a message.
  - If yes, his vote will be canceled.
  - If no, his vote will be canceled, and his new vote will be added.
- If he hasn't voted, his new vote will be added.

### examples

- Scenario 1: The bot found a new gacha message is posted. Then the bot add two buttons 「抽 0」, 「不抽 0」 to it. When a new user click 「抽 0」, its counter will increment, and the button become 「抽 1」.

- Scenario 2: The user in Scenario 1 regretted right after clicking and choose to revert the vote. He clicks the same button again and the counter is decremented.

## Details

### User voting

When user clicked a button, we will receive a [`callback_query`](https://core.telegram.org/bots/api#callbackquery).

There is a [`message`](https://core.telegram.org/bots/api#message) field in the result, which contains a [`reply_markup`](https://core.telegram.org/bots/api#inlinekeyboardmarkup) field. We update the text in it with the searching result from database.

### Database

The stored document will have these information

```typescript
{
  user_id: number,
  chat_id: number,
  message_id: number,
  name: string,
  data: string
}
```

## Potential Issues

### User voting

- When multiple users are voting a message at the same time, the buttons may be updated for mutiple process at the same time. However, actually only the latest process is needed.
