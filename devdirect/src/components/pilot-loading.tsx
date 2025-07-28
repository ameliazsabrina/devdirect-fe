import CircularText from "./circular-text";

export default function PilotLoading() {
  return (
    <CircularText
      text="Selamat•Datang•di•DevDirect•"
      onHover="speedUp"
      spinDuration={20}
      className="font-semibold text-primary text-xl"
    />
  );
}
