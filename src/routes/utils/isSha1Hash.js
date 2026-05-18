export default function isSha1Hash (value) {
	return /^[a-f0-9]{40}$/i.test(value);
}
