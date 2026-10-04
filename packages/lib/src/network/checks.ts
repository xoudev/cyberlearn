import type { NetworkCheck } from "@cyberlearn/types";
import { inSubnet, isHostAddress, parseCidr, parseIp } from "./ip";
import { ping } from "./ping";
import { deviceByName, linkBetween, type Network } from "./topology";

/**
 * Whether a <NetworkLab> check holds on a network: the site ticks the boxes
 * after every change, the lesson check reads the same rules.
 */
export function checkHolds(network: Network, check: NetworkCheck): boolean {
  switch (check.expect) {
    case "ping":
      return ping(network, check.from, check.to).ok;
    case "address": {
      const device = deviceByName(network, check.device);
      const subnet = parseCidr(check.in);
      if (!device || subnet === null) return false;
      return Object.values(device.addresses).some(
        (a) =>
          a.prefix === subnet.prefix &&
          inSubnet(a.ip, subnet.address, subnet.prefix) &&
          isHostAddress(a.ip, a.prefix),
      );
    }
    case "gateway": {
      const device = deviceByName(network, check.device);
      const ip = parseIp(check.is);
      return device !== undefined && ip !== null && device.gateway === ip;
    }
    case "route": {
      const device = deviceByName(network, check.device);
      const to = parseCidr(check.to);
      const via = check.via === undefined ? null : parseIp(check.via);
      if (!device || to === null || (check.via !== undefined && via === null)) return false;
      return device.routes.some(
        (r) =>
          r.prefix === to.prefix &&
          inSubnet(r.network, to.address, to.prefix) &&
          (via === null || r.via === via),
      );
    }
    case "link": {
      const a = deviceByName(network, check.between[0]);
      const b = deviceByName(network, check.between[1]);
      return a !== undefined && b !== undefined && linkBetween(network, a.id, b.id) !== undefined;
    }
    case "count":
      return network.devices.filter((d) => d.kind === check.kind).length >= check.min;
  }
}
