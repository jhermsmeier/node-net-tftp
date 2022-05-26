# Trivial File Transfer Protocol (TFTP)



## Installation

```shell
npm install --save net-tftp
```



## Usage

```shell
net-tftp [command] [options]
```



## References

### Implemented

- [RFC 1350] - THE TFTP PROTOCOL (REVISION 2)

### Intent to Implement

- [RFC 1782], [RFC 2347] - TFTP Option Extension
- [RFC 1783], [RFC 2348] - TFTP Blocksize Option
- [RFC 1784], [RFC 2349] - TFTP Timeout Interval and Transfer Size Options



## Deviations from RFCs

**RFC 1350, Section 2:**

> TFTP recognizes only one error condition that does not cause
> termination, the source port of a received packet being incorrect.
> In this case, an error packet is sent to the originating host.

We do not send error packets to the originating host in this case, to prevent sending interfering traffic, and to protect this from being abused in reflection-based attacks.

Further, any other misdirected packets (such as for example ACKs sent to port 69) receive the same silent treatment, and are simply ignored.

This shouldn't have any detrimental effects as the host sending the misdirected packet should time out eventually on what it believes to be its transaction.


**RFC 2347, Negotiation Protocol:**

> The client appends options at the end of the Read Request or Write
> request packet, as shown above.  Any number of options may be
> specified; however, an option may only be specified once.  The order
> of the options is not significant.

The restriction that an option may only be specified once is not enforced – instead – the option specified last "wins"


[RFC 1350]: https://www.rfc-editor.org/rfc/rfc1350.html
[RFC 1782]: https://www.rfc-editor.org/rfc/rfc1782.html
[RFC 1783]: https://www.rfc-editor.org/rfc/rfc1783.html
[RFC 1784]: https://www.rfc-editor.org/rfc/rfc1784.html
[RFC 2347]: https://www.rfc-editor.org/rfc/rfc2347.html
[RFC 2348]: https://www.rfc-editor.org/rfc/rfc2348.html
[RFC 2349]: https://www.rfc-editor.org/rfc/rfc2349.html
