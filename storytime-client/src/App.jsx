import "./App.css";
import { BookViewer } from "./features/3DBook/BookViewer";
import { Form } from "./pages/Form";

function App() {
  return (
    <div className="md:flex">
      <div className="drawer lg:drawer-open">
        <input
          id="my-drawer-4"
          type="checkbox"
          className="drawer-toggle inline"
        />

        <div className="drawer-content">
          {/* Navbar */}
          <nav className="navbar w-full bg-base-300">
            <label
              htmlFor="my-drawer-4"
              aria-label="open sidebar"
              className="btn btn-square btn-ghost drawer-button"
            >
              {/* Sidebar toggle icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2"
                fill="none"
                stroke="currentColor"
                className="my-1.5 inline-block size-4"
              >
                <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"></path>
                <path d="M9 4v16"></path>
                <path d="M14 10l2 2l-2 2"></path>
              </svg>
            </label>

            <h1 className="pl-2 text-4xl font-bold">STORYTIME</h1>

            <img src="/storytime-icon.svg" alt="" className="pl-2 h-8" />
          </nav>

          {/* Page content here */}
          <BookViewer />
        </div>

        <div className="drawer-side is-drawer-close:overflow-visible">
          <label
            htmlFor="my-drawer-4"
            aria-label="close sidebar"
            className="drawer-overlay"
          ></label>

          <div className="p-2 flex flex-col gap-4 min-h-full justify-center items-center bg-base-200 is-drawer-close:hidden is-drawer-open:sm:w-96">
            {/* Sidebar content here */}
            <img src="/storytime-icon.svg" alt="" />

            <h2 className="text-2xl font-semibold">Choose the parameters</h2>

            <Form />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
