import express from "express";
import { SuperfaceClient } from "@superfaceai/one-sdk";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const supabase = createClient(
  "https://prvlhoizntfiogewpuey.supabase.co",
  process.env.SUPABASE_KEY
);

const app = express();
app.use(cors());
app.set("trust proxy", true);

const sdk = new SuperfaceClient();

const requestOptions = {
  method: "GET",
  redirect: "follow"
};

function logError(context, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${context}`);
  if (error instanceof Error) {
    console.error(error.stack);
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
}

async function run(ip) {
  console.log(`[IP Lookup] Looking up: ${ip}`);
  try {
    const key = process.env.GEO_KEY;
    const url = `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${key}&ip=${ip}`;
    const res = await fetch(url, requestOptions);

    if (!res.ok) {
      throw new Error(`Failed to fetch geo data: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    logError("Geo lookup failed", err);
    return null;
  }
}

app.get("/", async (req, res) => {
  try {
    const ip = req.ip;
    const obj = await run(ip);

    if (!obj) {
      throw new Error("Geo lookup returned null or undefined");
    }

    const cleanedObj = {
      ip_address: obj.ip,
      country: obj.location.country_name,
      country_code: obj.location.country_code2,
      locality: obj.city,
      region: obj.location.state_prov,
      latitude: parseFloat(obj.location.latitude),
      longitude: parseFloat(obj.location.longitude),
      postal_code: obj.location.zipcode,
      time_zone: obj.location.time_zone?.name ?? null
    };

    const { data, error } = await supabase
      .from("locations")
      .insert(cleanedObj)
      .select();

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    res.send(data[0]);
  } catch (error) {
    logError(`Request to / from ${req.ip}`, error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.get("/points", async (req, res) => {
  try {
    const { data, error } = await supabase.from("locations").select("*");

    if (error) {
      throw new Error(`Supabase fetch error: ${error.message}`);
    }

    res.send(data);
  } catch (error) {
    logError(`Request to /points from ${req.ip}`, error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("✅ Server listening on http://localhost:3000");
});
