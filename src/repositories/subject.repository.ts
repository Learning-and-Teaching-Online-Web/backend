import { supabase } from "../config/supabase";

export async function findAll() {

  return await supabase
    .from("subjects")
    .select("*");
}