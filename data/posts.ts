import { ticketConversationHref, ticketSellerId } from "./scenarios/ticket";

export type ThreadPost = {
  author: string;
  time: string;
  text: string;
  counts: readonly [number, number, number, number];
  topic?: string;
  href?: string;
};

export const featuredPost: ThreadPost = {
  author: ticketSellerId,
  time: "2 小時",
  topic: "演唱會",
  href: ticketConversationHref,
  counts: [24, 6, 2, 5],
  text: "原本約好一起去看週六晚場，但朋友臨時不能去。原價讓一張演唱會票，有興趣可以私訊我。",
};

export const posts: readonly ThreadPost[] = [
  featuredPost,
  { author: "rainy.walk", time: "4 小時", counts: [19, 3, 1, 2], text: "下課回家本來想抄近路，結果繞進一條沒走過的小巷，還遇到一隻完全不想理我的貓。" },
  { author: "after.class", time: "6 小時", counts: [12, 2, 0, 1], text: "今天把期中報告交出去之後，才發現冰箱裡還有一塊昨天買的布丁。這大概是本週最順利的一件事。" },
];
