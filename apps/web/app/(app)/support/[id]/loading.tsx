import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { SupportHeaderSkeleton } from "../_components/support-skeleton";

/**
 * One request while it loads, drawn on the page's own classes: the header,
 * the .tk-head line (status, way back), the .tk-thread of messages (the
 * team's tinted, as on the page) and TicketReply's form.
 */

const MESSAGES = [
  { staff: false, who: 196, lines: 4, last: "58%" },
  { staff: true, who: 290, lines: 3, last: "42%" },
  { staff: false, who: 196, lines: 1, last: "66%" },
] as const;

export default function TicketLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement de ta demande">
      <SupportHeaderSkeleton crumb={304} eyebrow={120} title="9em" />

      <div className="tk-head" aria-hidden="true">
        <Skeleton w={84} h={20} />
        <Skeleton w={140} h={10} />
      </div>

      <ol className="tk-thread" aria-hidden="true">
        {MESSAGES.map((message, i) => (
          <li key={i} className="tk-msg" data-staff={message.staff}>
            <Skeleton
              w={message.who}
              h={10}
              style={{ maxWidth: "100%", margin: "1.5px 0 7.5px" }}
            />
            <SkeletonText
              lines={message.lines}
              lastWidth={message.last}
              lineHeight={13}
              gap={10.8}
              style={{ paddingBlock: 5.4 }}
            />
          </li>
        ))}
      </ol>

      {/* TicketReply: the label, the four-row textarea, the button. */}
      <div className="cls-assign__form tk-reply" aria-hidden="true">
        <div className="cls-field">
          <Skeleton w={62} h={9} style={{ margin: "2.6px 0" }} />
          <Skeleton h={90} />
        </div>
        <Skeleton w={82} h={34} />
      </div>
    </div>
  );
}
