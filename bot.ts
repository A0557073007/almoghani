bot.onNewMention(async (thread) => {
  await thread.subscribe();
  await thread.post("Sure! Here's a quick summary...");
});
bot.onReaction(async (thread, reaction) => {
  await thread.post(`Thanks for the ${reaction.emoji}!`);
});
bot.onSubscribedMessage(async (thread, msg) => {
  await thread.post("Checking now...");
});