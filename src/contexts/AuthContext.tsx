
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email);
      
      // Check if this is a test account
      const isTest = isTestAccount(email);
      
      // First try normal sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If we get an error and this is a test account, try to create it
      if (error && isTest) {
        console.log("Test account signin failed, attempting to create it:", error.message);
        
        // Get test account metadata
        const metadata = getTestAccountMetadata(email);
        
        if (!metadata) {
          throw new Error("Unknown test account type");
        }
        
        // We need to create test accounts differently due to email validation
        // First, create a regular account with random email that will pass validation
        const tempEmail = `temp${Date.now()}@example.com`;
        console.log("Creating temporary account with email:", tempEmail);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password,
          options: {
            data: metadata
          }
        });

        if (signUpError) {
          toast.error(signUpError.message);
          throw signUpError;
        }
        
        if (signUpData?.user?.id) {
          // Now update the email to the actual test email through the API
          // This bypasses email validation since we're updating an existing user
          console.log("Updating email to test account email:", email);
          
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            email: email
          });
          
          if (updateError) {
            toast.error(updateError.message);
            throw updateError;
          }
          
          // Try signing in again immediately
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) {
            toast.error(retryError.message);
            throw retryError;
          }
          
          toast.success("Test account created and signed in!");
        }
      } else if (error) {
        toast.error(error.message);
        throw error;
      }
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      throw error;
    }
  };
