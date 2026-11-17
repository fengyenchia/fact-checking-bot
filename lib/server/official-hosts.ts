const services = [
  {
    name: "蝦皮購物",
    aliases: ["shopee", "蝦皮"],
    domain: "shopee.tw",
    hosts: ["shopee.tw", "help.shopee.tw", "s.shopee.tw"],
    source: "https://help.shopee.tw/portal/4/article/79947",
  },
  {
    name: "momo 購物網",
    aliases: ["momo", "momoshop"],
    domain: "momoshop.com.tw",
    hosts: ["www.momoshop.com.tw"],
    source: "https://www.momoshop.com.tw/main/Main.jsp",
  },
  {
    name: "PChome 24h 購物",
    aliases: ["pchome"],
    domain: "pchome.com.tw",
    hosts: ["24h.pchome.com.tw", "www.pchome.com.tw"],
    source: "https://24h.pchome.com.tw/",
  },
  {
    name: "露天市集",
    aliases: ["ruten", "露天"],
    domain: "ruten.com.tw",
    hosts: ["www.ruten.com.tw", "pub.ruten.com.tw"],
    source: "https://pub.ruten.com.tw/anti-fraud/",
  },
  {
    name: "Yahoo 奇摩",
    aliases: ["yahoo", "奇摩"],
    domain: "yahoo.com",
    hosts: ["tw.buy.yahoo.com", "tw.bid.yahoo.com"],
    source: "https://tw.buy.yahoo.com/",
  },
  {
    name: "旋轉拍賣",
    aliases: ["carousell", "旋轉拍賣"],
    domain: "carousell.com",
    hosts: ["carousell.com", "tw.carousell.com", "support.carousell.com"],
    source: "https://support.carousell.com/hc/zh-tw/articles/900006113806",
  },
  {
    name: "iOPEN Mall",
    aliases: ["iopenmall"],
    domain: "iopenmall.tw",
    hosts: ["mall.iopenmall.tw"],
    source: "https://mall.iopenmall.tw/iopen/",
  },
  {
    name: "台灣樂天市場",
    aliases: ["rakuten", "樂天"],
    domain: "rakuten.com.tw",
    hosts: ["www.rakuten.com.tw"],
    source: "https://www.rakuten.com.tw/",
  },
  {
    name: "friDay 購物",
    aliases: ["friday"],
    domain: "friday.tw",
    hosts: ["shopping.friday.tw", "ec-w.shopping.friday.tw"],
    source: "https://shopping.friday.tw/",
  },
  {
    name: "博客來",
    aliases: ["博客來"],
    domain: "books.com.tw",
    hosts: ["www.books.com.tw"],
    source: "https://www.books.com.tw/",
  },
  {
    name: "Pinkoi",
    aliases: ["pinkoi"],
    domain: "pinkoi.com",
    hosts: ["www.pinkoi.com"],
    source: "https://www.pinkoi.com/",
  },
  {
    name: "酷澎台灣",
    aliases: ["coupang", "酷澎"],
    domain: "coupang.com",
    hosts: ["www.tw.coupang.com"],
    source: "https://www.tw.coupang.com/article/safeShopping",
  },
  {
    name: "7-ELEVEN 賣貨便／交貨便",
    aliases: ["myship", "myship2", "7-eleven", "7-11", "賣貨便", "交貨便"],
    domain: "7-11.com.tw",
    hosts: [
      "myship.7-11.com.tw",
      "myship2.7-11.com.tw",
      "eservice.7-11.com.tw",
    ],
    source: "https://myship.7-11.com.tw/Home/HelpCenter",
  },
  {
    name: "全家好賣＋／寄件店到店",
    aliases: ["famiport", "famistore", "好賣"],
    domain: "famiport.com.tw",
    hosts: ["famistore.famiport.com.tw", "fmec.famiport.com.tw"],
    source: "https://famistore.famiport.com.tw/",
  },
  {
    name: "萊爾富／萊收貨",
    aliases: ["hilife", "hipickup", "萊爾富", "萊收貨"],
    domain: "hilife.com.tw",
    hosts: ["www.hilife.com.tw", "hipickup.hilife.com.tw"],
    source: "https://hipickup.hilife.com.tw/DC_HRP/Faq.aspx?id=6",
  },
  {
    name: "OK mart",
    aliases: ["okmart"],
    domain: "okmart.com.tw",
    hosts: ["www.okmart.com.tw", "ecservice.okmart.com.tw"],
    source: "https://ecservice.okmart.com.tw/Tracking/Search",
  },
  {
    name: "蝦皮店到店",
    aliases: ["spx"],
    domain: "spx.tw",
    hosts: ["spx.tw"],
    source: "https://spx.tw/",
  },
  {
    name: "新竹物流",
    aliases: ["cagweb01", "新竹物流"],
    domain: "hct.com.tw",
    hosts: ["cagweb01.hct.com.tw"],
    source: "https://cagweb01.hct.com.tw/",
  },
  {
    name: "嘉里大榮物流",
    aliases: ["kerrytj", "大榮物流"],
    domain: "kerrytj.com",
    hosts: ["www.kerrytj.com"],
    source: "https://www.twse.com.tw/pdf/ch/2608_ch.pdf",
  },
  {
    name: "黑貓宅急便",
    aliases: ["t-cat", "黑貓", "宅急便"],
    domain: "t-cat.com.tw",
    hosts: ["www.t-cat.com.tw"],
    source: "https://www.t-cat.com.tw/inquire/traceContinus.aspx",
  },
  {
    name: "中華郵政",
    aliases: ["postserv", "中華郵政"],
    domain: "post.gov.tw",
    hosts: ["www.post.gov.tw", "postserv.post.gov.tw"],
    source: "https://postserv.post.gov.tw/pstmail/main_mail.html",
  },
  {
    name: "台灣宅配通",
    aliases: ["e-can", "宅配通"],
    domain: "e-can.com.tw",
    hosts: ["www.e-can.com.tw"],
    source: "https://www.e-can.com.tw/",
  },
  {
    name: "台灣順豐速運",
    aliases: ["sf-express", "順豐"],
    domain: "sf-express.com",
    hosts: ["htm.sf-express.com"],
    source: "https://htm.sf-express.com/tw/tc/dynamic_function/waybill/",
  },
  {
    name: "拓元售票",
    aliases: ["tixcraft", "拓元"],
    domain: "tixcraft.com",
    hosts: ["tixcraft.com", "help.tixcraft.com"],
    source: "https://help.tixcraft.com/hc/zh-tw/articles/4404363906961",
  },
  {
    name: "KKTIX",
    aliases: ["kktix"],
    domain: "kktix.com",
    hosts: ["kktix.com", "support.kktix.com"],
    source: "https://support.kktix.com/hc/zh-tw/articles/23055347123993",
  },
  {
    name: "ibon 售票",
    aliases: ["ibon"],
    domain: "ibon.com.tw",
    hosts: ["ticket.ibon.com.tw"],
    source: "https://ticket.ibon.com.tw/",
  },
  {
    name: "Ticket Plus 遠大售票",
    aliases: ["ticketplus", "遠大售票"],
    domain: "ticketplus.com.tw",
    hosts: ["ticketplus.com.tw"],
    source: "https://ticketplus.com.tw/terms",
  },
  {
    name: "FamiTicket 全網購票網",
    aliases: ["famiticket", "全網購票"],
    domain: "famiticket.com.tw",
    hosts: ["www.famiticket.com.tw"],
    source: "https://www.famiticket.com.tw/Home",
  },
  {
    name: "OPENTIX 兩廳院文化生活",
    aliases: ["opentix", "兩廳院"],
    domain: "opentix.life",
    hosts: ["www.opentix.life"],
    source: "https://www.opentix.life/",
  },
];

export function findOfficialHost(host: string) {
  return services.find(({ hosts }) => hosts.includes(host));
}

export function findReferencedService(subdomain: string, domainLabel: string) {
  const subdomainLabels = subdomain.split(".");
  return services.find(({ aliases }) =>
    aliases.some(
      (alias) =>
        subdomainLabels.includes(alias) ||
        domainLabel.startsWith(`${alias}-`) ||
        domainLabel.endsWith(`-${alias}`),
    ),
  );
}
