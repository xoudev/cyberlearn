// App.jsx — Root composition
function App() {
  return (
    <div className="app">
      <Navbar />
      <Sidebar />
      <main className="main">
        <div className="content">
          <LessonHero />
          <LessonBody />
          <Quiz />
        </div>
        <Rail />
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
