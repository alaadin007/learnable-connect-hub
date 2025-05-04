
import React from "react";
import { Navigate } from "react-router-dom";

const Home = () => {
  // Redirect to Index page since they serve the same purpose
  return <Navigate to="/" replace />;
};

export default Home;
