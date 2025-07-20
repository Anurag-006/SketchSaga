import axios from "axios";
import { HTTP_BACKEND } from "../config";

export async function getExistingShapes(roomId: string) {
  console.log("The room id inside getExistingShapes is: ", roomId);
  
  const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`, { withCredentials: true });
  const messages = res.data.messages;
  console.log("Messages are: ", messages);
  

  const shapes = messages.map((message: { message: string }) => {
    const messageData = JSON.parse(message.message);
    return messageData;
  });

  console.log(shapes);

  return shapes;
}
