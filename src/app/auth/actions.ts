"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/")
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("full_name") as string
  const orgName = formData.get("org_name") as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create organization and link profile
  if (data.user) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName })
      .select()
      .single()

    if (orgError) {
      return { error: orgError.message }
    }

    // Update profile with organization_id (profile was auto-created by trigger)
    await supabase
      .from("profiles")
      .update({
        organization_id: org.id,
        full_name: fullName,
      })
      .eq("id", data.user.id)
  }

  redirect("/")
}

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Check your email for a magic link!" }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
