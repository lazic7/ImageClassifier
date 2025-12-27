import "./App.css";
import { Navbar, UploadCard } from "./components";

function App() {
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <UploadCard />
      </div>
    </>
  );
}

export default App;
