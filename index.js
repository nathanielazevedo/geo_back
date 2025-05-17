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
  console.log(ip)
  try {
    const key = process.env.GEO_KEY;
    const url = `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${key}&ip=${ip}`;
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
  try {
    const obj = await run(req.ip);
    console.log(obj)
    if (!obj) {
      throw new Error("Geo lookup returned null or undefined");
    }
    console.log(obj)
    const cleanedObj = {  ip_address: obj.ip,
    country: obj.location.country_name,
    country_code: obj.location.country_code2,
    locality: obj.city,
    region: obj.location.state_prov,
    latitude: parseFloat(obj.location.latitude),
    longitude: parseFloat(obj.location.longitude),
    postal_code: obj.location.zipcode,
    time_zone: obj.location.time_zone?.name ?? null }


    const { data, error } = await supabase
      .from("locations")
      .insert(cleanedObj)
      .select();

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
    console.log(data)
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

app.listen(3000, () => {
  console.log("Server listening on 3000");
});
