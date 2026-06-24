export const entries = [
  {
    slug: "after-the-rain",
    title: "雨停之后",
    summary: "关于一场夏雨、潮湿街道，以及光重新出现的片刻。",
    date: "06.18",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85",
    body: [
      "雨是在傍晚停下的。城市像被擦拭过一遍，所有声音都隔着一层湿润的空气。",
      "我们沿着没有名字的小路慢慢走。光从云后回来，落在墙面、树叶和积水里。那些平日里容易错过的事物，在这一刻显得格外清楚。",
    ],
  },
  {
    slug: "white-room",
    title: "白色房间",
    summary: "空间、器物与日常生活之间，安静而准确的距离。",
    date: "05.27",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85",
    body: [
      "房间里没有多余的东西。早晨的光穿过薄帘，先照亮桌角，然后缓慢地移动。",
      "极简并不是空无一物，而是让每一件留下来的东西，都拥有足够的空间。",
    ],
  },
] as const;

export function getEntry(slug: string) {
  return entries.find((entry) => entry.slug === slug);
}
