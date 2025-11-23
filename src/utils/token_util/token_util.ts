import axios from "axios";
import Cookie from "universal-cookie";
import { endpoints } from "../endpoints/endpoints";

export async function getTokenOrRefresh() {
  const cookie = new Cookie();
  const speechToken = cookie.get("speech-token");

  if (speechToken === undefined) {
    try {

      const res = await axios.get(endpoints.getSttToken);
      const token = res.data.token;
      const region = res.data.region;
      cookie.set("speech-token", region + ":" + token, {
        maxAge: 540,
        path: "/",
      });
      return { authToken: token, region: region };

    } catch (err) {
      console.log((err as any).response.data);
      return { authToken: null, error: (err as any).response.data };
    }
  } else {
    const idx = speechToken.indexOf(":");
    return {
      authToken: speechToken.slice(idx + 1),
      region: speechToken.slice(0, idx),
    };
  }
}


