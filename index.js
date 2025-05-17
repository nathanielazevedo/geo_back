import express from "express";
import { SuperfaceClient } from "@superfaceai/one-sdk";
import cors from "cors";

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

// Create a single supabase client for interacting with your database

const supabase = createClient(
  "https://prvlhoizntfiogewpuey.supabase.co",
  process.env.SUPABASE_KEY
);

const app = express();
app.use(cors());
app.set("trust proxy", true);

const sdk = new SuperfaceClient();

async function run(ip) {
  // Load the profile
  const profile = await sdk.getProfile("address/ip-geolocation@1.0.1");

  // Use the profile
  const result = await profile.getUseCase("IpGeolocation").perform(
    {
      ipAddress: ip,
    },
    {
      provider: "ipdata",
      security: {
        apikey: {
          apikey: process.env.GEO_KEY,
        },
      },
    }
  );

  // Handle the result
  try {
    const data = result.unwrap();
    return data;
  } catch (error) {
    throw new Error(error);
  }
}

app.get("/", async (req, res) => {
  try {
    const obj = await run(req.ip);
    Object.keys(obj).forEach((str) => {
      if (str !== "latitude" && str !== "longitude") {
        obj[str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] =
          obj[str];
        delete obj[str];
      } else {
        obj[str] = Math.round(obj[str] * 100) / 100;
      }
    });
    const { data, error } = await supabase
      .from("locations")
      .insert(obj)
      .select();
    if (error) throw new Error(error);
    res.send(data[0]);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

app.get("/points", async (req, res) => {
  try {
    const { data, error } = await supabase.from("locations").select("*");
    if (error) throw new Error(error);
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

app.listen(3000, () => {
  console.log("Server listening on 3000");
});
