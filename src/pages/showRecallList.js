import { recallGroupItem, recallTail, recallImgItem, recallMsgItem } from "../render_modules/HTMLtemplate.js";

document.querySelector(".logs").innerText += "脚本正在工作\n";
const groupList = new Map();
const parser = new DOMParser();

lite_tools.onReacllMsgData((_, map) => {
  const filterListEl = document.querySelector(".qq-number-filter");
  document.querySelector(".logs").innerText += `获取到消息map 共有${map.size}\n`;
  document.querySelector(".logs").innerText += `开始整理数据\n`;

  const tipsEl = parser.parseFromString(recallGroupItem, "text/html").querySelector(".filter-item");
  if (map.size) {
    tipsEl.querySelector(".chat-type").innerText = `正在整理消息...`;
  } else {
    tipsEl.querySelector(".chat-type").innerText = `本地没有数据`;
  }
  filterListEl.appendChild(tipsEl);

  filterListEl.innerHTML = "";
  map.forEach((msgData) => {
    const peerUid = msgData.peerUid;
    const find = groupList.get(peerUid);
    if (find) {
      find.push(msgData);
    } else {
      groupList.set(peerUid, [msgData]);
    }
  });
  groupList.forEach((msgArr) => msgArr.sort((a, b) => a.msgTime - b.msgTime));

  document.querySelector(".logs").innerText += `整理结束，共有 ${groupList.size} 个独立群组或私聊，输出到dom\n`;
  try {
    groupList.forEach((msgArr) => {
      const chatType = msgArr[0].chatType === 1 ? "私聊" : "群组";
      const peerName = getPeerName(msgArr);
      const peerUid = msgArr[0].peerUid;
      const groupItemEl = parser.parseFromString(recallGroupItem, "text/html").querySelector(".filter-item");

      if (msgArr[0].chatType === 1) {
        new Promise(async (res) => {
          document.querySelector(".logs").innerText += `尝试获取 ${msgArr[0].peerUid}\n`;
          const userInfo = await lite_tools.getUserInfo(msgArr[0].peerUid);
          document.querySelector(".logs").innerText += `${JSON.stringify(userInfo[0].payload)}\n`;
          const peerName = userInfo[0].payload.info.remark || userInfo[0].payload.info.nick;
          groupItemEl.querySelector(".peer-name").innerText = peerName;
          groupItemEl.querySelector(".peer-name").title = peerName;
          groupItemEl.querySelector(".peer-uid").innerText = `(${userInfo[0].payload.info.uin})`;
          res();
        });
      }

      groupItemEl.querySelector(".chat-type").innerText = `[${chatType}]`;
      groupItemEl.querySelector(".peer-name").innerText = peerName;
      groupItemEl.querySelector(".peer-name").title = peerName;
      groupItemEl.querySelector(".peer-uid").innerText = `(${peerUid})`;
      groupItemEl.addEventListener("click", () => {
        document.querySelector(".filter-item.active")?.classList?.remove("active");
        groupItemEl.classList.add("active");
        updateUid(peerUid);
      });
      filterListEl.appendChild(groupItemEl);
    });
  } catch (err) {
    document.querySelector(".logs").innerText += `出错${err.message}\n`;
  }
});

function updateUid(uid) {
  const msgList = groupList.get(uid);
  document.title = `撤回消息查看 ${document.querySelector(".filter-item.active").innerText} 共计 ${msgList.length} 条数据`;
  const msgListEl = document.querySelector(".msg-list");
  msgListEl.innerHTML = "";
  msgListEl.scrollTop = 0;
  try {
    msgList.forEach((msg) => {
      const recallMsgItemEl = parser.parseFromString(recallMsgItem, "text/html").querySelector(".msg-item");
      const recallTailEl = parser.parseFromString(recallTail, "text/html").querySelector(".tail");
      recallTailEl.innerText = msg?.lite_tools_recall?.recallTime
        ? `${new Date(msg.lite_tools_recall.recallTime * 1000).toLocaleString("zh-CN")} 被 ${
            msg.lite_tools_recall.operatorNick || msg.lite_tools_recall.origMsgSenderNick
          } 撤回`
        : "没有撤回信息";
      recallTailEl.setAttribute("time", recallTailEl.innerText);
      const textContent = getTextContent(msg.elements);
      recallMsgItemEl.querySelector(".user-name").innerText = msg.sendNickName || msg.sendMemberName;
      recallMsgItemEl.querySelector(".msg-text").innerText = textContent;
      const picList = getPicList(msg.elements);
      if (picList.length) {
        const imgListEl = recallMsgItemEl.querySelector(".msg-img-list");
        picList.forEach((pic) => {
          const picEl = parser.parseFromString(recallImgItem, "text/html").querySelector(".msg-img-item");
          const imgEl = picEl.querySelector("img");
          imgEl.src = `appimg://${pic}`;
          imgEl.setAttribute("alt", "图片加载失败");
          imgListEl.appendChild(picEl);
        });
      }
      if (!textContent.length && !picList.length) {
        recallMsgItemEl.querySelector(".msg-text").innerHTML = `<blue>[不支持的消息类型]</blue>`;
      }
      recallMsgItemEl.querySelector(".msg-text").appendChild(recallTailEl);
      const prevEl = msgListEl.querySelector(".msg-item");
      if (prevEl) {
        msgListEl.insertBefore(recallMsgItemEl, prevEl);
      } else {
        msgListEl.appendChild(recallMsgItemEl);
      }
    });
  } catch (err) {
    document.querySelector(".logs").innerText += `出错${err.message}\n`;
  }
}
function getTextContent(elements) {
  let textContent = "";
  elements.forEach((element) => {
    if (element.textElement && element.textElement.content) {
      textContent += element.textElement.content;
    }
  });
  return textContent;
}

function getPicList(elements) {
  const picList = [];
  elements.forEach((element) => {
    if (element.picElement && element.picElement.sourcePath) {
      picList.push(element.picElement.sourcePath);
    }
  });
  return picList;
}

function getPeerName(elements) {
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.peerName) {
      return element.peerName;
    }
  }
  return "没有找到名称";
}

lite_tools.getReacllMsgData();
