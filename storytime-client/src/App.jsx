import "./App.css";
import { BookViewer } from "./features/3DBook/BookViewer";
import { Form } from "./pages/Form";

function App() {
  return (
    <div className="flex">
      <div className="w-fit">
        <Form />
      </div>

      <div className="w-full">
        <BookViewer />
      </div>
    </div>
  );
}

export default App;
