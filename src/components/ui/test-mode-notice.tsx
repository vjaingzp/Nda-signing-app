export function TestModeNotice() {
  return (
    <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <span className="font-semibold">Test mode.</span> This is a simulated
      payment for a portfolio/demo project.{" "}
      <span className="font-semibold">No real charge is made</span> and no
      payment details are collected.
    </div>
  );
}
