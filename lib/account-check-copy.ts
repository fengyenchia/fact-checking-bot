export function accountCheckCopy(reported: boolean) {
  return reported ? {
    title: "曾被通報",
    advice: "建議立即停止交易並通報",
    highlight: "該帳號可能涉及網購詐騙活動",
    summary: "這個帳號曾被通報過，可能涉及網購詐騙！\n建議馬上停止交易，並且千萬不要點開連結！",
  } : {
    title: "無法確定",
    advice: "建議使用其他機制進行查證或通報",
    highlight: "該帳號暫無相關通報紀錄",
    summary: "建議先停止交易，利用以下機制再次查證，或是前往通報喔！",
  };
}
