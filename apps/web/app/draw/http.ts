import axios from "axios";
import { HTTP_BACKEND } from "../config";
import { Shape } from "./Game";

export async function getExistingShapes(roomId: string): Promise<Shape[]> {
  const res = await axios.get(`${HTTP_BACKEND}/shapes/${roomId}`, {
    withCredentials: true,
  });

  return res.data.shapes as Shape[];
}
