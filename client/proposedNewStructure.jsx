function App() {
  return (
    <div className="relative h-screen bg-black text-white">
      {/* MAP LAYER */}
      <div className="absolute inset-0">
        {/* <Map /> */}
      </div>

      {/* UI OVERLAY */}
      <div className="relative z-10 flex h-full flex-col gap-4 p-4">
        {/* TOP NAV */}
        <div className="bg-green/80 rounded-lg px-4 py-2">
          Top Nav
        </div>

        {/* PANELS ROW */}
        <div className="flex flex-1 min-h-0 gap-4">
          <div className="bg-blue/80 rounded-lg px-4 py-2 basis-1/4 h-full overflow-y-auto break-words">          
Panel 1          </div>

          <div className="bg-blue/80 rounded-lg px-4 py-2 basis-1/2 h-full overflow-y-auto break-words">           
panel 2          </div>

          <div className="bg-blue/80 rounded-lg px-4 py-2 basis-1/4 h-full overflow-y-auto break-words">      
panel 3
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div className="bg-green/80 rounded-lg px-4 py-2">
          Bottom Nav
        </div>
      </div>
    </div>
  );
}


export default App;
