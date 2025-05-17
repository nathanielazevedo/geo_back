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

import fetch from "node-fetch";

const requestOptions = {
  method: "GET",
  redirect: "follow"
};

async function run(ip) {
  try {
    const key = process.env.GEO_KEY;
    const url = `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${key}&ip=8.8.8.8`;
    const res = await fetch(url, requestOptions);

    if (!res.ok) {
      throw new Error(`Failed to fetch geo data: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Geo lookup failed:", err.message);
    return null;
  }
}



app.get("/", async (req, res) => {
  console.log("hitting");
  try {
    const obj = await run(req.ip);

    if (!obj) {
      throw new Error("Geo lookup returned null or undefined");
    }

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

    console.log("error dog", data);
    if (error) throw new Error(error.message);

    res.send(data[0]);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: error.message });
  }
});


app.get("/points", async (req, res) => {
  try {
    const { data, error } = await supabase.from("locations").select("*");
    console.log(error)
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
